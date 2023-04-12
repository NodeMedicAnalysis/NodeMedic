import json
from sys import argv
from pathlib import Path


STRING_OPS = {
    'precise:string.concat': 'concat',
    'imprecise:concat': 'concat',
    '+': 'concat',
    'imprecise:join': 'concat',
    'model:array.join': 'concat',
    'precise:string.replace': 'base',
    'precise:string.slice': 'base',
    'model:string.split': 'base',
}

LITERAL_TYPES = {
    'Tainted': 'input',
    'Untainted': 'constant',
}

SINKS = {
    'call:eval': 'eval',
    'call:exec': 'exec',
    'call:execSync': 'exec',
    'call:Function': 'eval',
}


class OperationTreeNode(object):
    def __init__(self, node_type, op=None, operands=None, value=None):
        self.node_type = node_type
        self.operation = op
        if self.node_type == 'operation':
            self.operands = operands
        elif self.node_type == 'literal':
            self.value = value
        else:
            raise Exception(f'Unhandled node type: {node_type}')
    
    def __repr__(self):
        if self.node_type == 'operation':
            out_str = f'({self.operation},\n ['
            for operand in self.operands:
                out_str += f'{operand},\n'
            out_str += ']\n)\n'
        elif self.node_type == 'literal':
            out_str = f'("{self.value}")'
        return out_str


def determine_node_type(node_data):
    op = node_data['operation']
    is_string_op = False
    for string_op in STRING_OPS.keys():
        if string_op in node_data['operation']:
            is_string_op = True
    if is_string_op:
        return 'string_op'
    is_literal = op in LITERAL_TYPES
    if is_literal:
        return 'literal'
    is_sink = False
    for sink in SINKS.keys():
        if sink == op:
            is_sink = True
    if is_sink:
        return 'sink'
    is_call = 'call' in op
    if is_call:
        return 'call'
    if 'imprecise' in op:
        return 'imprecise'
    return 'other'


def parse_operation_node(tree_data, id, depth=1):
    node_data = tree_data[id]
    node_type = determine_node_type(node_data)
    op = node_data['operation']
    if node_type == 'string_op':
        operands = []
        for parent_id in node_data['flows_from']:
            parent_node = parse_operation_node(tree_data, parent_id, depth=depth + 2)
            if parent_node:
                operands.append(parent_node)
        return OperationTreeNode('operation', op=STRING_OPS[op], operands=operands)
    elif node_type == 'literal':
        value = node_data['value']
        if '[String' in value:
            if "'" in value:
                value = value.split("'")[1]
            else:
                value = value.strip('[String: ')
        return OperationTreeNode('literal', op=LITERAL_TYPES[op], value=value)
    elif node_type == 'call':
        assert len(node_data['flows_from']) > 0
        parent_id = node_data['flows_from'][0]
        return parse_operation_node(tree_data, parent_id, depth=depth + 2)
    elif node_type == 'imprecise':
        assert len(node_data['flows_from']) > 0
        if op == 'imprecise:assign':
            parent_id = node_data['flows_from'][-1]
        else:
            parent_id = node_data['flows_from'][0]
        return parse_operation_node(tree_data, parent_id, depth=depth + 2)
    elif node_type == 'sink':
        assert len(node_data['flows_from']) == 1
        parent_id = node_data['flows_from'][0]
        parent = parse_operation_node(tree_data, parent_id, depth=depth + 2)
        return OperationTreeNode('operation', op=SINKS[op], operands=[parent])
    elif node_type == 'other' and op in ['object.GetField', 'object.putField', 'string.GetField', 'string.putField']:
        assert len(node_data['flows_from']) > 0
        if len(node_data['flows_from']) > 1:
            left_node = tree_data[node_data['flows_from'][0]]
            right_node = tree_data[node_data['flows_from'][1]]
            if left_node['tainted']:
                return parse_operation_node(tree_data, node_data['flows_from'][0], depth=depth + 2)
            elif right_node['tainted']:
                return parse_operation_node(tree_data, node_data['flows_from'][1], depth=depth + 2)
            else:
                raise Exception('Neither putField parent node is tainted')
        else:
            return parse_operation_node(tree_data, node_data['flows_from'][0], depth=depth + 2)
    elif node_type == 'other' and op == 'object.Unary':
        assert len(node_data['flows_from']) == 1
        parent_id = node_data['flows_from'][0]
        return parse_operation_node(tree_data, parent_id, depth=depth + 2)
    else:
        # raise Exception(f'Unhandled SMT node:\nNode: <<{node_data}>>\nType: <<{node_type}>>\nOp: <<{op}>>')
        return None


def parse_to_operation_tree(tree_data):
    root_id = min(list(tree_data.keys()))
    return parse_operation_node(tree_data, root_id)


def serialize_operation_tree(operation_tree_node):
    out = {}
    if operation_tree_node.node_type == 'operation':
        out[operation_tree_node.operation] = {}
        for i, operand in enumerate(operation_tree_node.operands):
            out[operation_tree_node.operation][f'op{i}'] = serialize_operation_tree(operand)
    elif operation_tree_node.node_type == 'literal':
        out[operation_tree_node.operation] = operation_tree_node.value
    else:
        raise Exception(f'Unhandled node type: {operation_tree_node.node_type}:{operation_tree_node.operation}')
    return out


def generate_smt_from_node(operation_tree_node, input_ctr):
    out = ''
    if operation_tree_node.node_type == 'operation' and operation_tree_node.operation == 'concat':
        if len(operation_tree_node.operands) > 0:
            out += '(str.++ '
            for operand in operation_tree_node.operands:
                outP, input_ctr = generate_smt_from_node(operand, input_ctr)
                out += outP
            out += ')'
        else:
            outP, input_ctr = generate_smt_from_node(
                OperationTreeNode(node_type='literal', op='input'),
                input_ctr
            )
            out += outP
    elif operation_tree_node.node_type == 'operation' and operation_tree_node.operation == 'base':
        assert len(operation_tree_node.operands) > 0
        outP, input_ctr = generate_smt_from_node(operation_tree_node.operands[0], input_ctr)
        out += outP
    elif operation_tree_node.node_type == 'operation' and operation_tree_node.operation in ['exec', 'eval']:
        assert len(operation_tree_node.operands) == 1
        outP, input_ctr = generate_smt_from_node(operation_tree_node.operands[0], input_ctr)
        out += outP
    elif operation_tree_node.node_type == 'literal':
        if operation_tree_node.operation == 'constant':
            out += f' "{operation_tree_node.value}" '
        elif operation_tree_node.operation == 'input':
            out += f' input{input_ctr} '
            input_ctr += 1
    else:
        raise Exception(f'Unhandled node type: {operation_tree_node.node_type}:{operation_tree_node.operation}')
    return (out, input_ctr)


def generate_smt(operation_tree):
    query_harness_pre = '(assert (str.contains'
    sink_node_type = operation_tree.operation
    if sink_node_type == 'eval':
        query_harness_post = '"__proto__+global.CTF();//"))\n'
    elif sink_node_type == 'exec':
        query_harness_post = '"$(touch success);#"))\n'
    else:
        raise Exception(f'Unhandled sink: {sink_node_type}')
    query, input_ctr = generate_smt_from_node(operation_tree.operands[0], 0)
    preamble = ''.join([f'(declare-const input{i} String)\n' for i in range(input_ctr)])
    postamble = '(check-sat)\n(get-model)'
    query_harness = ' '.join([query_harness_pre, query, query_harness_post])
    return preamble + query_harness + postamble


def main(args):
    if len(args) < 2:
        raise Exception('Expected arguments: (--optree | --smt) path')
    method = args[0]
    tree_path = Path(args[1])
    with open(tree_path, 'r') as tree_f:
        tree_data = json.loads(tree_f.read())
    operation_tree = parse_to_operation_tree(tree_data)
    if method == '--optree':
        serialized_operation_tree = serialize_operation_tree(operation_tree)
        print(json.dumps(serialized_operation_tree, indent=2))
    elif method == '--smt':
        smt = generate_smt(operation_tree)
        print(smt)
    else:
        raise Exception(f'Unhandled method: {method}')


if __name__ == '__main__':
    main(argv[1:])
