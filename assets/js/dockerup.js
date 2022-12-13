// Hide additional options for specific languags (versions, dependencies...)
function hideUnusedOptions() {
  const languages = ["py", "java", "go", "node", "ruby", "perl"];
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
    var dockerfile = "";
    hideUnusedOptions();

    switch(language) {
      case "python":
        if (app == "") {app = "app.py";}
        document.getElementById("hidden-py").removeAttribute("hidden");
        var pyVersion = document.getElementById('py-version').value;
        var pyRequirements = document.getElementById('py-requirements').value;

        dockerfile = '# build\n' +
                     `FROM python:${pyVersion}-slim\n` +
                     'WORKDIR /app\n' +
                     'COPY . .\n' +
                     'ENV PYTHONUNBUFFERED=1\n';
        // integrate requirements install, if selected
        if (pyRequirements == "requirements.txt") {
          dockerfile += 'ENV VIRTUAL_ENV=/venv\n' +
                        'RUN python -m venv $VIRTUAL_ENV\n' +
                        'ENV PATH="$VIRTUAL_ENV/bin:$PATH"\n' +
                        'RUN pip3 install --upgrade pip\n' +
                        'RUN pip3 install --no-cache-dir wheel\n' +
                        'RUN pip3 install --no-cache-dir -r requirements.txt\n';
        }
        if (pyRequirements == "setup.py") {
          dockerfile += 'RUN python setup.py install\n' +
                        '\n# run\n' +
                        `${envAndPorts}ENTRYPOINT ["${app}"]`;
        } else {
          dockerfile += '\n# run\n' +
                        `${envAndPorts}ENTRYPOINT ["python", "${app}"]`;
        }
        break;

      case "java":
        if (app == '') {app = 'org.domain.App'}
        document.getElementById("hidden-java").removeAttribute("hidden");
        var javaVersion = document.getElementById('java-version').value;
        var javaBuild = document.getElementById('java-build').value;

        // differentiate Apache Maven and Gradle Build Tool
        if (javaBuild == 'maven') {
           dockerfile = '# build\n' +
                        `FROM maven:3-eclipse-temurin-${javaVersion}-alpine AS builder\n` +
                        'WORKDIR /build\n' +
                        'COPY . .\n' +
                        'RUN mvn clean package -DskipTests -Djar.finalName=app dependency:copy-dependencies -DoutputDirectory=target/app-dependencies\n' +
                        '\n# run\n' +
                        `FROM eclipse-temurin:${javaVersion}-alpine\n` +
                        'WORKDIR /app\n' +
                        'COPY --from=builder /build/target/app.jar .\n' +
                        'COPY --from=builder /build/target/app-dependencies app-dependencies\n' +
                        `${envAndPorts}` +
                        `ENTRYPOINT ["java", "-cp", "app.jar:app-dependencies/*", "${app}"]`
        } else {
          // Official Gradle image for JDK 19 is still not avaiable, so we fallback to 17; JDK8 Gradle image is only avaiable based on for Ubuntu
          var buildFrom;
          switch (javaVersion) {
            case '19': buildFrom = 'FROM gradle:3-eclipse-temurin-jdk17-alpine AS builder\n# Gradle 19 is still not available (https://hub.docker.com/_/gradle/)\n'
            break;
            case '17':
            case '11':  buildFrom = `FROM gradle:3-eclipse-temurin-jdk${javaVersion}-alpine AS builder\n`
            break;
            case '8':  buildFrom = 'FROM gradle:3-eclipse-temurin-jdk8-jammy AS builder\n'
            break;
          }
            dockerfile = '# build\n' +
                         `${buildFrom}` +
                         'WORKDIR /build\n' +
                         'COPY . .\n' +
                         'RUN gradle build\n' +
                         'RUN tar xf build/distributions/complete.tar\n' +
                         '\n# run\n' +
                         `FROM eclipse-temurin:${javaVersion}-alpine\n` +
                         'WORKDIR /app\n' +
                         'COPY --from=builder /build/build/libs/*.jar app.jar\n' +
                         'COPY --from=builder /build/complete/lib app-dependencies\n' +
                         `${envAndPorts}` +
                         `ENTRYPOINT ["java", "-cp", "app.jar:app-dependencies/*", "${app}"]`
          };
        break;

      case "go":
        if (app == "") {app = "cmd/app-name/main.go";}
        document.getElementById("hidden-go").removeAttribute("hidden");
        var goVersion = document.getElementById('go-version').value;
        var goModules = document.getElementById('go-modules').value;

        dockerfile = '# build\n' +
                     `FROM golang:${goVersion}-alpine AS builder\n` +
                     'WORKDIR /build\n' +
                     'RUN apk add build-base\n' +
                     'COPY . .\n';
        if (goModules != "") {dockerfile += "RUN go mod download\n";}
        dockerfile += `RUN go build -o app ${app}\n` +
                      '\n# run\n' +
                      "FROM alpine:latest\n" +
                      "COPY --from=builder /build .\n" +
                      `${envAndPorts}` +
                      'ENTRYPOINT ["./app"]';
        break;

      case "rust":
        if (app == "") {app = "app-name";}
        dockerfile = '# build\n' +
                     'FROM rust:1.65.0-slim as builder\n' +
                     'WORKDIR /build\n' +
                     `RUN USER=root cargo new ${app}\n` +
                     `COPY Cargo.* /build/${app}/\n` +
                     `WORKDIR /build/${app}\n` +
                     'RUN rustup target add x86_64-unknown-linux-musl\n' +
                     'RUN cargo build --target x86_64-unknown-linux-musl --release\n' +
                     `COPY src /build/${app}/src/\n` +
                     `RUN touch /build/${app}/src/main.rs\n` +
                     'RUN cargo build --target x86_64-unknown-linux-musl --release\n' +
                     '\n# run\n' +
                     "FROM alpine:latest\n"                                                                  +
                     `COPY --from=builder /build/${app}/target/x86_64-unknown-linux-musl/release/${app} .\n` +
                     `${envAndPorts}` +
                     `ENTRYPOINT ["./${app}"]`;
       break;

      case "node":
        if (app == "") {app = "server.js";}
        document.getElementById("hidden-node").removeAttribute("hidden");
        var nodeVersion = document.getElementById('node-version').value;
        var nodeEnv = document.getElementById('node-env').value;

        dockerfile = '# build\n' +
                     `FROM node:${nodeVersion}-alpine\n` +
                     'WORKDIR /app\n'                    +
                     'COPY . .\n'                        +
                     `ENV NODE_ENV=${nodeEnv}\n`         +
                     'RUN npm install';
        if (nodeEnv == "production") {dockerfile += ' --production\n';} else {dockerfile += "\n";}
        dockerfile += '\n# run\n' +
                      `${envAndPorts}` +
                      `ENTRYPOINT ["node", "${app}"]`;
        break;

      case "ruby":
        if (app == "") {app = "main.rb";}
        document.getElementById("hidden-ruby").removeAttribute("hidden");
        var rubyVersion = document.getElementById('ruby-version').value;
        var rubyGemfile = document.getElementById('ruby-gemfile').value;

        dockerfile = '# build\n' +
                     `FROM ruby:${rubyVersion}-alpine\n` +
                     "WORKDIR /app\n" +
                     "COPY . .\n";
        if (rubyGemfile != "") {dockerfile += 'RUN bundle install --without development test\n';}
        dockerfile += '\n# run\n' +
                      `${envAndPorts}` +
                      `ENTRYPOINT ["ruby", "${app}"]`;
        break;

      case "perl":
        if (app == "") {app = "main.pl";}
        document.getElementById("hidden-perl").removeAttribute("hidden");
        var perlVersion = document.getElementById("perl-version").value;
        var perlModules = document.getElementById("perl-modules").value;

        dockerfile = '# build\n' +
                     `FROM perl:${perlVersion}-slim\n` +
                     "WORKDIR /app\n" +
                     "COPY . .\n";
        if (perlModules != "") {dockerfile += "RUN cpanm --installdeps .\n";}
        dockerfile += '\n# run\n' +
                      `${envAndPorts}` +
                      `ENTRYPOINT ["perl", "${app}"]`;
        break;

      case "c":
        if (app == "") {app = "main.c";}
        dockerfile = '# build\n' +
                     'FROM gcc:latest AS builder\n' +
                     "WORKDIR /build\n" +
                     "COPY . .\n" +
                     `RUN gcc -o app ${app}\n` +
                     '\n# run\n' +
                     "FROM alpine:latest\n" +
                     "WORKDIR /app\n" +
                     "RUN apk add libc6-compat\n" +
                     "COPY --from=builder /build/app .\n" +
                     `${envAndPorts}` +
                     'ENTRYPOINT ["./app"]';
        break;

      case "elixir":
        if (app == "") {app = "phx.server";}
        dockerfile = '# build\n' +
                     'FROM elixir:latest\n' +
                     'WORKDIR /app\n'       +
                     'COPY . .\n'           +
                     'RUN mix local.hex --force\n' +
                     '\n# run\n' +
                     `${envAndPorts}` +
                     `ENTRYPOINT ["mix", "${app}"]`;
        break;
    }

    document.getElementById("app").placeholder = `e.g. ${app}`;
    dockerfileText.innerHTML = `${dockerfile}\n\n# made with ❤️ on Docker UP!\n`;
    Prism.highlightElement(dockerfileText);
  }
}

