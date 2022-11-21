function hideUnused() {
  document.getElementById("hidden-py").setAttribute("hidden", "");
  document.getElementById("hidden-go").setAttribute("hidden", "");
  document.getElementById("hidden-node").setAttribute("hidden", "");
  document.getElementById("hidden-ruby").setAttribute("hidden", "");
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
        if (app == '') {app = 'app.py'}
        document.getElementById("hidden-py").removeAttribute("hidden");
        document.getElementById('app').placeholder = "e.g. app.py";
        var pyVersion = document.getElementById('py-version').value;
        var pyRequirements = document.getElementById('py-requirements').value;

        var pythonBuildSpec = `FROM python:${pyVersion}-alpine\n` +
                              'WORKDIR /app\n'                    +
                              'RUN apk add build-base\n'          +
                              'COPY . .\n'                        +
                              'ENV PYTHONUNBUFFERED=1';
        var pythonBuildVenv = 'ENV VIRTUAL_ENV=/venv\n'                              +
                              'RUN python -m venv $VIRTUAL_ENV\n'                    +
                              'ENV PATH="$VIRTUAL_ENV/bin:$PATH"\n'                  +
                              'RUN pip3 install --upgrade pip\n'                     +
                              'RUN pip3 install --no-cache-dir wheel\n'              +
                              'RUN pip3 install --no-cache-dir -r requirements.txt';
        var pythonRunSpec = `ENTRYPOINT ["python", "${app}"]`


        pyRequirements != '' ? buildsAndDependencies = pythonBuildSpec + '\n' + pythonBuildVenv : buildsAndDependencies = pythonBuildSpec;
        envPortsAndRun = envAndPorts + pythonRunSpec;
        break;

      case 'go':
        if (app == '') {app = 'main.go'}
        document.getElementById("hidden-go").removeAttribute("hidden");
        document.getElementById('app').placeholder = "e.g. cmd/app-name/main.go";
        var goVersion = document.getElementById('go-version').value;
        var goModules = document.getElementById('go-modules').value;

        var goBuildBase = `FROM golang:${goVersion}-alpine AS builder\n` +
                          'WORKDIR /build\n'                             +
                          'RUN apk add build-base\n'                     +
                          'COPY . .';
        var goBuildModules = 'RUN go mod download';
        var goBuildFinal = `RUN go build -o app ${app}`
        var goRunSpec = 'FROM alpine:latest\n'           +
                        'COPY --from=builder /build .\n' +
                        'ENTRYPOINT ["./app"]';

        goModules != '' ? buildsAndDependencies = goBuildBase + '\n' + goBuildModules + '\n' + goBuildFinal : buildsAndDependencies = goBuildBase + '\n' + goBuildFinal;
        envPortsAndRun = envAndPorts + goRunSpec;
        break;

      case 'node':
        if (app == '') {app = 'server.js'}
        document.getElementById("hidden-node").removeAttribute("hidden");
        document.getElementById('app').placeholder = "e.g. server.js";
        var nodeVersion = document.getElementById('node-version').value;
        var nodeEnv = document.getElementById('node-env').value;

        var nodeBuildSpec = `FROM node:${nodeVersion}-alpine\n` +
                            'WORKDIR /app\n'                    +
                            'COPY . .\n'                        +
                            `ENV NODE_ENV=${nodeEnv}\n`         +
                            'RUN npm install'
        var nodeRunSpec = `ENTRYPOINT ["node", "${app}"]`

        nodeEnv == 'production' ? buildsAndDependencies = nodeBuildSpec + ' --production' : buildsAndDependencies = nodeBuildSpec;
        envPortsAndRun = envAndPorts + nodeRunSpec;
        break;

      case 'ruby':
        if (app == '') {app = 'main.rb'}
        document.getElementById("hidden-ruby").removeAttribute("hidden");
        document.getElementById('app').placeholder = "e.g. main.rb";
        var rubyVersion = document.getElementById('ruby-version').value;
        var rubyGemfile = document.getElementById('ruby-gemfile').value;

        var rubyBuildSpec = `FROM ruby:${rubyVersion}-alpine\n` +
                            'WORKDIR /app\n'                    +
                            'COPY . .'
        var rubyRunSpec = `ENTRYPOINT ["ruby", "${app}"]`

        rubyGemfile != '' ? buildsAndDependencies = rubyBuildSpec + '\nRUN bundle install --without development test' : buildsAndDependencies = rubyBuildSpec;
        envPortsAndRun = envAndPorts + rubyRunSpec;
        break;

      case 'c':
        if (app == '') {app = 'main.c'}

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

