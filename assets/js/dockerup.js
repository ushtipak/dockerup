function dockerup() {
  var dockerfileText = document.getElementById('dockerfile');
  var language = document.getElementById('language').value;
  var env = document.getElementById('env').value;
  var ports = document.getElementById('ports').value;

  var buildsAndDependencies;
  var envAndPorts = '';
  var envPortsAndRun;

  if (env != '') {
    env.split(/\r?\n/).forEach((kv) => {
      if (kv != '') {
        envAndPorts += `ENV ${kv}\n`;
      }
    });
  };
  if (ports != '') {
    ports.split(",").forEach((kv) => {
      envAndPorts += `EXPOSE ${kv}\n`;
    }) ;
  };

  var pythonBuildSpec = 'FROM python:3.10-alpine\n'                             +
                        'WORKDIR /app\n'                                        +
                        'RUN apk add build-base\n'                              +
                        'COPY . .\n'                                            +
                        'ENV VIRTUAL_ENV=/venv\n'                               +
                        'RUN python3.10 -m venv $VIRTUAL_ENV\n'                 +
                        'ENV PATH="$VIRTUAL_ENV/bin:$PATH"\n'                   +
                        'RUN pip3 install --upgrade pip\n'                      +
                        'RUN pip3 install --no-cache-dir wheel\n'               +
                        'RUN pip3 install --no-cache-dir -r requirements.txt\n' +
                        'ENV PYTHONUNBUFFERED=1';
  var pythonRunSpec = 'CMD ["python3", "app.py"]'

  var goBuildSpec = 'FROM golang:alpine AS builder\n' +
                    'WORKDIR /app\n'                  +
                    'RUN apk add build-base\n'        +
                    'COPY . .\n'                      +
                    'RUN go build -o app main.go'
  var goRunSpec = 'FROM alpine:latest\n'         +
                  'COPY --from=builder /app .\n' +
                  'CMD ["./app"]'

  var cFile = 'test.c';
  var cBuildSpec = 'FROM gcc:latest AS builder\n' +
                   'WORKDIR /build\n'             +
                   'COPY . .\n'                   +
                   `RUN gcc -o app ${cFile}`
  var cRunSpec = 'FROM alpine:latest\n'               +
                 'WORKDIR /app\n'                     +
                 'RUN apk add libc6-compat\n'         +
                 'COPY --from=builder /build/app .\n' +
                 'ENTRYPOINT ["./app"]'

  if (language != '') {
    switch(language) {
      case 'python':
        buildsAndDependencies = pythonBuildSpec;
        envPortsAndRun = envAndPorts + pythonRunSpec;
        break;
      case 'go':
        buildsAndDependencies = goBuildSpec;
        envPortsAndRun = envAndPorts + goRunSpec;
        break;
      case 'c':
        buildsAndDependencies = cBuildSpec;
        envPortsAndRun = envAndPorts + cRunSpec;
        break;
      default:
    }

    var dockerfile = `# build\n${buildsAndDependencies}\n\n# run\n${envPortsAndRun}\n\n# made with ❤️ on Docker UP!\n`;
    dockerfileText.innerHTML = dockerfile;
    Prism.highlightElement(dockerfileText);
  }
}

