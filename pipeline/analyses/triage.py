from enum import Enum
import json
from pathlib import Path
import sys
from time import time
from typing import List, Optional, Tuple

from numpy import clip
from numpy.random import randint, uniform, normal, seed

# Set a seed for reproducibility
seed(0)


class TransitionSignal(Enum):
    CONTINUE = 0
    HALT = 1


class AttackerAutomata(object):
    IMPLICIT_SANITIZERS = ['stringify', 'replace', 'substr', 'indexOf']
    EXPLICIT_SANITIZERS = ['htmlencode', 'urlencode', 'encode', 
                            'escape', 'sanitize', 'queryString', 
                            'paramString', 'bodyString', 'headerString']
    OBJECT_ACCESS = ['getField', 'putField']
    T1_SINKS = ['exec']
    T2_SINKS = ['eval', 'Function', 'execSync']
    
    def __init__(self):
        self._epsilon = None
        self._states = None
        self._edges = None
        self._final_accept_state = None
        self._str_families = None
    
    def _check_compiled(self):
        if (
            self._epsilon is None 
            or self._states is None
            or self._edges is None
            or self._final_accept_state is None
        ):
            raise Exception('Compile automata before running')

    def compile(self, epsilon: float, prov_ad_tree: dict):
        self._epsilon = epsilon
        self._states = prov_ad_tree['tree']
        self._edges = prov_ad_tree['flows_to']
        self._final_accept_state = prov_ad_tree['sink']    
    
    def get_next(
        self,
        current_state: str
    ) -> Tuple[str, Optional[str], TransitionSignal]:
        next_states = self._edges[current_state]
        if self._str_families < 1:
            return (current_state, None, TransitionSignal.HALT)
        if len(next_states) == 0:
            if self._final_accept_state == 't1':
                return ('S', None, TransitionSignal.HALT)
            elif self._final_accept_state == 't2' and self._str_families > 1:
                return ('S', None, TransitionSignal.HALT)
            else:
                return (current_state, None, TransitionSignal.HALT)
        next_state = next_states[randint(0, len(next_states))]
        next_symbol = self._states[next_state]['operation']   
        return (next_state, next_symbol, TransitionSignal.CONTINUE)
    
    @staticmethod
    def operation_matches(op1: str, op_list: List[str]) -> bool:
        for op2 in op_list:
            if op2.lower() in op1.lower():
                return True
            if op1.lower() in op2.lower():
                return True
        return False
    
    def transition(
        self,
        current_state: str,
        next_symbol: str,
        next_state: str
    ) -> Tuple[str, TransitionSignal]:
        if self.operation_matches(next_symbol, self.IMPLICIT_SANITIZERS):
            if uniform(0, 1) < ((self._str_families - 1) / self._str_families):
                self._str_families -= 1
                return (next_state, TransitionSignal.CONTINUE)
            else:
                return (current_state, TransitionSignal.HALT)
        elif self.operation_matches(next_symbol, self.EXPLICIT_SANITIZERS):
            if uniform(0, 1) < (1 / self._str_families):
                self._str_families = min(self._str_families, 2)
                return (next_state, TransitionSignal.CONTINUE)
            else:
                return (current_state, TransitionSignal.HALT)
        elif self.operation_matches(next_symbol, self.OBJECT_ACCESS):
            if uniform(0, 1) < (1 - (self._str_families * self._epsilon)):
                return (next_state, TransitionSignal.CONTINUE)
            else:
                return (current_state, TransitionSignal.HALT)
        else:
            if uniform(0, 1) < (1 - self._epsilon):
                return (next_state, TransitionSignal.CONTINUE)
            else:
                return (current_state, TransitionSignal.HALT)
        
    def run(self, str_families: int, current_state: str) -> str:
        self._check_compiled()
        self._str_families = str_families
        while True:
            next_state, next_symbol, tsignal = self.get_next(current_state)
            if tsignal is TransitionSignal.HALT:
                return next_state
            current_state, tsignal = self.transition(
                current_state, next_symbol, next_state
            )
            if tsignal is TransitionSignal.HALT:
                return current_state


class AutomataSimulation(object):
    def __init__(self, 
        atk: AttackerAutomata,
        epsilon: float,
        mu: int,
        simulations: int = 1000,
    ):
        self._atk = atk        
        self._mu = mu
        self._epsilon = epsilon
        self._simulations = simulations

    def bernoulli_trials(self, prov_ad_tree) -> float:
        success = 0
        total = 0
        self._atk.compile(self._epsilon, prov_ad_tree)
        controllable = len(prov_ad_tree['controllable_leaf_ids']) + 1
        for _ in range(self._simulations):
            str_families = int(
                clip(abs(normal(self._mu, controllable)), 1, self._mu + 1)
            )
            start_state = prov_ad_tree['leaf_ids'][
                randint(0, len(prov_ad_tree['leaf_ids']))
            ]
            final_state = self._atk.run(str_families, start_state)
            if final_state == 'S':
                success += 1
            total += 1
        return (success / total)



def generate_flows_to(provenance_data: json) -> dict:
    node_ids = list(provenance_data.keys())
    flows_to = {}
    for node_id1 in node_ids:
        flows_to[node_id1] = []
        for node_id2 in node_ids:
            if node_id1 in provenance_data[node_id2]['flows_from']:
                flows_to[node_id1].append(node_id2)
    return flows_to


def generate_prov_ad_tree(provenance_data: json) -> dict:
    flows_to = generate_flows_to(provenance_data)
    node_ids = list(provenance_data.keys())
    leaf_ids = []
    for node_id in node_ids:
        if provenance_data[node_id]['flows_from'] == []:
            leaf_ids.append(node_id)
    controllable_leaf_ids = []
    for leaf_id in leaf_ids:
        if len(flows_to[leaf_id]) == 1:
            op = provenance_data[flows_to[leaf_id][0]]['operation']
            if 'set_taint' in op:
                controllable_leaf_ids.append(leaf_id)
    implicit_sanitizers = []
    explicit_sanitizers = []
    object_access_sanitizers = []
    total_operations = 0
    for node_id in node_ids:
        node = provenance_data[node_id]
        operation = node['operation']
        if AttackerAutomata.operation_matches(
            operation, AttackerAutomata.IMPLICIT_SANITIZERS
        ):
            implicit_sanitizers.append(operation)
        if AttackerAutomata.operation_matches(
            operation, AttackerAutomata.EXPLICIT_SANITIZERS
        ):
            explicit_sanitizers.append(operation)
        if AttackerAutomata.operation_matches(
            operation, AttackerAutomata.OBJECT_ACCESS
        ):
            object_access_sanitizers.append(operation)
        total_operations += 1
    root_node_op = provenance_data['1']['operation']
    sink = ''
    if AttackerAutomata.operation_matches(
        root_node_op, AttackerAutomata.T2_SINKS
    ):
        sink = 't2'
    elif AttackerAutomata.operation_matches(
        root_node_op, AttackerAutomata.T1_SINKS
    ):
        sink = 't1'
    else:
        raise Exception(f'Unhandled sink type: {root_node_op}')
    prov_ad_tree = {
        'tree': provenance_data,
        'flows_to': flows_to,
        'leaf_ids': leaf_ids,
        'controllable_leaf_ids': controllable_leaf_ids,
        'sink': sink,
        'implicit_sanitizers': implicit_sanitizers,
        'explicit_sanitizers': explicit_sanitizers,
        'object_access_sanitizers': object_access_sanitizers,
        'total_operations': total_operations,
    }
    return prov_ad_tree


def score_to_rating(score: int) -> str:
    if score <= (1 / 3):
        return 'LOW'
    elif score <= (2 / 3):
        return 'MEDIUM'
    else:
        return 'HIGH'


def longest_path(provenance_data: json, current_id=None) -> int:
    if current_id is None:
        current_id = "1"
    child_ids = provenance_data[current_id]['flows_from']
    child_lens = []
    for child_id in child_ids:
        if int(child_id) > int(current_id):
            child_lens.append(longest_path(provenance_data, child_id))
        else:
            print(f'Detected a cycle at node ID: {current_id}')
    if len(child_lens) > 0:
        return max(child_lens) + 1
    return 1


def triage_provenance(provenance_data: json) -> dict:
    prov_ad_tree = generate_prov_ad_tree(provenance_data)
    # Provenance graph population statistics
    MU = 3 # Average count of attacker-controllable leaves
    D = 36.88 # Average graph depth
    EPSILON = 1 / (MU * D)
    start = time()
    sim = AutomataSimulation(AttackerAutomata(), EPSILON, MU)
    score = sim.bernoulli_trials(prov_ad_tree)
    score_result = {
        'score': score,
        'rating': score_to_rating(score),
        'analysisTimeSec': time() - start
    }
    return {
        'countNodes': len(provenance_data.keys()),
        'longestPath': longest_path(provenance_data),
        'countLeaves': len(prov_ad_tree['leaf_ids']),
        'countControllableLeaves': len(prov_ad_tree['controllable_leaf_ids']),
        'countImplicit': len(prov_ad_tree['implicit_sanitizers']),
        'implicit': list(set(prov_ad_tree['implicit_sanitizers'])),
        'countExplicit': len(prov_ad_tree['explicit_sanitizers']),
        'explicit': list(set(prov_ad_tree['explicit_sanitizers'])),
        'countAccess': len(prov_ad_tree['object_access_sanitizers']),
        'objectAccess': list(set(prov_ad_tree['object_access_sanitizers'])),
        'operations': prov_ad_tree['total_operations'],
        'sink': prov_ad_tree['sink'],
        'result': score_result,
    }


def main(args):
    provenance_file = Path(args[0])
    assert provenance_file.exists(), \
        f'Provenance file does not exist: {provenance_file}'
    with open(provenance_file, 'r') as provenance_f:
        provenance_data = json.load(provenance_f)
    triage_results = triage_provenance(provenance_data)
    print(json.dumps(triage_results, indent=4, sort_keys=True))


if __name__ == '__main__':
    sys.setrecursionlimit(10000)
    main(sys.argv[1:])
