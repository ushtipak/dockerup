function hideUnused() {
  document.getElementById("hidden-py").setAttribute("hidden", "");
}

function dockerup() {
  var dockerfileText = document.getElementById('dockerfile');
  var language = document.getElementById('language').value;
  var app = document.getElementById('app').value;
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
      if (kv != '') {
        envAndPorts += `EXPOSE ${kv}\n`;
      }
    });
  };

  // if language is chosen, pre-hide specific, non-selected options
  if (language != '') {
    hideUnused();

    switch(language) {
      case 'python':
        document.getElementById("hidden-py").removeAttribute("hidden");
        document.getElementById('app').placeholder = "e.g. app.py";
        var pyVersion = document.getElementById('py-version').value;
        var pyRequirements = document.getElementById('py-requirements').value;
        if (app == '') {
          app = 'app.py'
        }

        var pythonBuildSpec = `FROM python:${pyVersion}-alpine\n`                             +
                              'WORKDIR /app\n'                                        +
                              'RUN apk add build-base\n'                              +
                              'COPY . .\n'                                            +
                              'ENV PYTHONUNBUFFERED=1';
        var pythonBuildVenv = 'ENV VIRTUAL_ENV=/venv\n'                               +
                              'RUN python3.10 -m venv $VIRTUAL_ENV\n'                 +
                              'ENV PATH="$VIRTUAL_ENV/bin:$PATH"\n'                   +
                              'RUN pip3 install --upgrade pip\n'                      +
                              'RUN pip3 install --no-cache-dir wheel\n'               +
                              'RUN pip3 install --no-cache-dir -r requirements.txt'
        var pythonRunSpec = `CMD ["python3", "${app}"]`


        pyRequirements != '' ? buildsAndDependencies = pythonBuildSpec + '\n' + pythonBuildVenv : buildsAndDependencies = pythonBuildSpec
        envPortsAndRun = envAndPorts + pythonRunSpec;
        break;

      case 'go':
        if (app == '') {
          app = 'main.go'
        }

        var goBuildSpec = 'FROM golang:alpine AS builder\n' +
                          'WORKDIR /build\n'                  +
                          'RUN apk add build-base\n'        +
                          'COPY . .\n'                      +
                          `RUN go build -o app ${app}`
        var goRunSpec = 'FROM alpine:latest\n'         +
                        'COPY --from=builder /build .\n' +
                        'CMD ["./app"]'

        buildsAndDependencies = goBuildSpec;
        envPortsAndRun = envAndPorts + goRunSpec;
        document.getElementById('app').placeholder = "e.g. cmd/app-name/main.go";
        break;

      case 'c':
        if (app == '') {
          app = 'main.c'
        }

        var cBuildSpec = 'FROM gcc:latest AS builder\n' +
                         'WORKDIR /build\n'             +
                         'COPY . .\n'                   +
                         `RUN gcc -o app ${app}`
        var cRunSpec = 'FROM alpine:latest\n'               +
                       'WORKDIR /app\n'                     +
                       'RUN apk add libc6-compat\n'         +
                       'COPY --from=builder /build/app .\n' +
                       'ENTRYPOINT ["./app"]'

        buildsAndDependencies = cBuildSpec;
        envPortsAndRun = envAndPorts + cRunSpec;
        document.getElementById('app').placeholder = "e.g. main.c";
        break;

      default:
    }

    var dockerfile = `# build\n${buildsAndDependencies}\n\n# run\n${envPortsAndRun}\n\n# made with ❤️ on Docker UP!\n`;
    dockerfileText.innerHTML = dockerfile;
    Prism.highlightElement(dockerfileText);
  }
}

