// Hide additional options for specific languags (versions, dependencies...)
function hideUnusedOptions() {
  const languages = ["py", "go", "node", "ruby", "perl"];
  languages.forEach(
    (l) => {document.getElementById(`hidden-${l}`).setAttribute("hidden", "");}
    );
}

function dockerup() {
  var dockerfileText = document.getElementById("dockerfile");
  var language = document.getElementById("language").value;
  var app = document.getElementById("app").value;
  var env = document.getElementById("env").value;
  var ports = document.getElementById("ports").value;

  var buildsAndDependencies;
  var envAndPorts = "";
  var envPortsAndRun;

  if (env != "") {
    env.split(/\r?\n/).forEach((kv) => {
      if (kv != "") {
        envAndPorts += `ENV ${kv}\n`;
      }
    });
  }
  if (ports != "") {
    ports.split(",").forEach((kv) => {
      if (kv != "") {
        envAndPorts += `EXPOSE ${kv}\n`;
      }
    });
  }

  // if language is chosen, pre-hide specific, non-selected options
  if (language != "") {
    hideUnusedOptions();

    switch(language) {
      case "python":
        if (app == "") {app = "app.py";}
        document.getElementById("hidden-py").removeAttribute("hidden");

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
        var pythonRunSpec = `ENTRYPOINT ["python", "${app}"]`;

        if (pyRequirements != "") {buildsAndDependencies = pythonBuildSpec + "\n" + pythonBuildVenv;} else {buildsAndDependencies = pythonBuildSpec;}
        envPortsAndRun = envAndPorts + pythonRunSpec;
        break;

      case "go":
        if (app == "") {app = "cmd/app-name/main.go";}
        document.getElementById("hidden-go").removeAttribute("hidden");
        var goVersion = document.getElementById('go-version').value;
        var goModules = document.getElementById('go-modules').value;

        var goBuildBase = `FROM golang:${goVersion}-alpine AS builder\n` +
                          'WORKDIR /build\n'                             +
                          'RUN apk add build-base\n'                     +
                          'COPY . .';
        var goBuildModules = "RUN go mod download";
        var goBuildFinal = `RUN go build -o app ${app}`;
        var goRunSpec = "FROM alpine:latest\n"            +
                        "COPY --from=builder /build .\n" +
                        'ENTRYPOINT ["./app"]';

        if (goModules != "") {buildsAndDependencies = goBuildBase + "\n" + goBuildModules + "\n" + goBuildFinal;} else {buildsAndDependencies = goBuildBase + "\n" + goBuildFinal;}
        envPortsAndRun = envAndPorts + goRunSpec;
        break;

      case "rust":
        if (app == "") {app = "app-name";}
        var rustBuildSpec = 'FROM rust:1.65.0-slim as builder\n'                             +
                            'WORKDIR /build\n'                                               +
                            `RUN USER=root cargo new ${app}\n`                               +
                            `COPY Cargo.* /build/${app}/\n`                                  +
                            `WORKDIR /build/${app}\n`                                        +
                            'RUN rustup target add x86_64-unknown-linux-musl\n'              +
                            'RUN cargo build --target x86_64-unknown-linux-musl --release\n' +
                            `COPY src /build/${app}/src/\n`                                  +
                            `RUN touch /build/${app}/src/main.rs\n`                          +
                            'RUN cargo build --target x86_64-unknown-linux-musl --release';
        var rustRunSpec = "FROM alpine:latest\n"                                                                  +
                          `COPY --from=builder /build/${app}/target/x86_64-unknown-linux-musl/release/${app} .\n` +
                          `ENTRYPOINT ["./${app}"]`;

        buildsAndDependencies = rustBuildSpec;
        envPortsAndRun = envAndPorts + rustRunSpec;
        break;

      case "node":
        if (app == "") {app = "server.js";}
        document.getElementById("hidden-node").removeAttribute("hidden");
        var nodeVersion = document.getElementById('node-version').value;
        var nodeEnv = document.getElementById('node-env').value;

        var nodeBuildSpec = `FROM node:${nodeVersion}-alpine\n` +
                            'WORKDIR /app\n'                    +
                            'COPY . .\n'                        +
                            `ENV NODE_ENV=${nodeEnv}\n`         +
                            'RUN npm install';
        var nodeRunSpec = `ENTRYPOINT ["node", "${app}"]`;

        if (nodeEnv == "production") {buildsAndDependencies = nodeBuildSpec + ' --production';} else {buildsAndDependencies = nodeBuildSpec;}
        envPortsAndRun = envAndPorts + nodeRunSpec;
        break;

      case "ruby":
        if (app == "") {app = "main.rb";}
        document.getElementById("hidden-ruby").removeAttribute("hidden");
        var rubyVersion = document.getElementById('ruby-version').value;
        var rubyGemfile = document.getElementById('ruby-gemfile').value;

        var rubyBuildSpec = `FROM ruby:${rubyVersion}-alpine\n` +
                            "WORKDIR /app\n"                    +
                            "COPY . .";
        var rubyRunSpec = `ENTRYPOINT ["ruby", "${app}"]`;

        if (rubyGemfile != "") {buildsAndDependencies = rubyBuildSpec + '\nRUN bundle install --without development test';} else {buildsAndDependencies = rubyBuildSpec;}
        envPortsAndRun = envAndPorts + rubyRunSpec;
        break;

      case "perl":
        if (app == "") {app = "main.pl";}
        document.getElementById("hidden-perl").removeAttribute("hidden");
        var perlVersion = document.getElementById("perl-version").value;
        var perlModules = document.getElementById("perl-modules").value;

        var perlBuildSpec = `FROM perl:${perlVersion}-slim\n` +
                            "WORKDIR /app\n"                  +
                            "COPY . .";
        var perlRunSpec = `ENTRYPOINT ["perl", "${app}"]`;

        if (perlModules != "") {buildsAndDependencies = perlBuildSpec + "\nRUN cpanm --installdeps .";} else {buildsAndDependencies = perlBuildSpec;}
        envPortsAndRun = envAndPorts + perlRunSpec;
        break;

      case "c":
        if (app == "") {app = "main.c";}

        var cBuildSpec = 'FROM gcc:latest AS builder\n' +
                         "WORKDIR /build\n"             +
                         "COPY . .\n"                   +
                         `RUN gcc -o app ${app}`;
        var cRunSpec = "FROM alpine:latest\n"               +
                       "WORKDIR /app\n"                     +
                       "RUN apk add libc6-compat\n"         +
                       "COPY --from=builder /build/app .\n" +
                       'ENTRYPOINT ["./app"]';

        buildsAndDependencies = cBuildSpec;
        envPortsAndRun = envAndPorts + cRunSpec;
        break;

      case "elixir":
        if (app == "") {app = "phx.server";}

        var elixirBuildSpec = 'FROM elixir:latest\n' +
                              'WORKDIR /app\n'       +
                              'COPY . .\n'           +
                              'RUN mix local.hex --force';
        var elixirRunSpec = `ENTRYPOINT ["mix", "${app}"]`;

        buildsAndDependencies = elixirBuildSpec;
        envPortsAndRun = envAndPorts + elixirRunSpec;
        break;

      default:
    }

    document.getElementById("app").placeholder = `e.g. ${app}`;
    var dockerfile = `# build\n${buildsAndDependencies}\n\n# run\n${envPortsAndRun}\n\n# made with ❤️ on Docker UP!\n`;
    dockerfileText.innerHTML = dockerfile;
    Prism.highlightElement(dockerfileText);
  }
}

