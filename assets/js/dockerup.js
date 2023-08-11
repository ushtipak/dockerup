// Hide additional options for specific languags (versions, dependencies...)
function hideUnusedOptions() {
  const languages = ["py", "java", "go", "node"];
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
        if (app == '') {app = 'javatemp'}
        document.getElementById("hidden-java").removeAttribute("hidden");
        var javaVersion = document.getElementById('java-version').value;
        var javaBuild = document.getElementById('java-build').value;
        var javaSnapshot = document.getElementById('java-snapshot').value;
        var javaArchive = document.getElementById('java-archive').value;

        // differentiate Apache Maven and Gradle Build Tool, Spring Boot and "plain" Java
        if (javaBuild == 'maven') {
          dockerfile = '# build\n' +
                        `FROM maven:3-eclipse-temurin-${javaVersion}-alpine AS builder\n` +
                        'WORKDIR /build\n' +
                        'COPY . .\n' +
                        'RUN mvn clean package -DskipTests -Djar.finalName=app dependency:copy-dependencies -DoutputDirectory=target/app-dependencies\n' +
                        '\n# run\n' +
                        `FROM eclipse-temurin:${javaVersion}-alpine\n` +
                        'WORKDIR /app\n' +
                        `COPY --from=builder /build/target/*${javaSnapshot}.${javaArchive} app.jar\n` +
                        'COPY --from=builder /build/target/app-dependencies app-dependencies\n' +
                        `${envAndPorts}` +
                        `ENTRYPOINT ["java", "-cp", "app.${javaArchive}:app-dependencies/*", "${app}"]`
          };
          if (javaBuild == 'springboot-maven') {
            dockerfile = '# build\n' +
                          `FROM maven:3-eclipse-temurin-${javaVersion}-alpine AS builder\n` +
                          'WORKDIR /build\n' +
                          'COPY . .\n' +
                          'RUN mvn clean package -DskipTests\n' +
                          '\n# run\n' +
                          `FROM eclipse-temurin:${javaVersion}-alpine\n` +
                          'WORKDIR /app\n' +
                          `COPY --from=builder /build/target/${app}-*${javaSnapshot}.${javaArchive} app.${javaArchive}\n` +
                          `${envAndPorts}` +
                          `ENTRYPOINT ["java", "-jar", "app.${javaArchive}"]`
          };
          if (javaBuild == 'springboot-gradle') {
            dockerfile = '# build\n' +
                          `FROM gradle:jdk${javaVersion}-alpine as builder\n` +
                          'WORKDIR /build\n' +
                          'COPY . .\n' +
                          'RUN gradle build --no-daemon\n' +
                          '\n# run\n' +
                          `FROM eclipse-temurin:${javaVersion}-alpine\n` +
                          'WORKDIR /app\n' +
                          `COPY --from=builder /build/build/libs/${app}-*${javaSnapshot}.${javaArchive} app.${javaArchive}\n` +
                          `${envAndPorts}` +
                          `ENTRYPOINT ["java", "-jar", "app.${javaArchive}"]`
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
                      "FROM alpine:3.17\n" +
                      "COPY --from=builder /build .\n" +
                      `${envAndPorts}` +
                      'ENTRYPOINT ["./app"]';
        break;

      case "rust":
        if (app == "") {app = "app-name";}
        dockerfile = '# build\n' +
                     'FROM rust:1.66.1-slim as builder\n' +
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
                     "FROM alpine:3.17\n"                                                                  +
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
        if (nodeEnv == "production") {dockerfile += ' --omit=dev\n';} else {dockerfile += "\n";}
        dockerfile += '\n# run\n' +
                      `${envAndPorts}` +
                      `ENTRYPOINT ["node", "${app}"]`;
        break;

      case "c":
        if (app == "") {app = "main.c";}
        dockerfile = '# build\n' +
                     'FROM gcc:latest AS builder\n' +
                     "WORKDIR /build\n" +
                     "COPY . .\n" +
                     `RUN gcc -o app ${app}\n` +
                     '\n# run\n' +
                     "FROM alpine:3.17\n" +
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

