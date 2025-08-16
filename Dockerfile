# Node.js v15.5.0
# Debian Buster
FROM node:15.5.0-buster

# Switch Buster to the archived repositories
RUN sed -i \
      -e 's|deb.debian.org/debian|archive.debian.org/debian|g' \
      -e 's|security.debian.org/debian-security|archive.debian.org/debian-security|g' \
    /etc/apt/sources.list \
 && echo 'Acquire::Check-Valid-Until "false";' \
    > /etc/apt/apt.conf.d/99no-check-valid-until

# Install essential packages
RUN apt-get update -qq \
 && apt-get install -qqy --no-install-recommends \
      bash make vim git graphviz python3 python3-numpy \
 && rm -rf /var/lib/apt/lists/*

# Set up the working directory
WORKDIR /nodemedic

# Install z3
RUN wget https://github.com/Z3Prover/z3/releases/download/z3-4.8.9/z3-4.8.9-x64-ubuntu-16.04.zip
RUN unzip z3-4.8.9-x64-ubuntu-16.04.zip
RUN mv z3-4.8.9-x64-ubuntu-16.04 z3
RUN cd z3 && echo "export PATH=$PATH:$(pwd)/bin" >> /root/.bashrc

# Set up Jalangi2
COPY lib ./lib
RUN cd lib && ./setup-deps.sh

# Set up node environment
RUN npm i -g n typescript@5.0.4
COPY package*.json ./
RUN npm i

# Set up NodeMedic analysis
COPY src ./src
COPY tests ./tests
COPY tsconfig.json .
COPY Makefile .
RUN make clean && make

# Set up pipeline
COPY pipeline ./pipeline
RUN cd pipeline && npm i
RUN cd pipeline && tsc -b

# Copy casestudies script
COPY install_run_casestudies.sh .

# Hand over to bash for interactive usage
CMD ["/bin/bash"]
