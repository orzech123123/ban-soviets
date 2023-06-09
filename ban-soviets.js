const { execSync } = require("child_process");

function nextInterval() {
  setTimeout(function () {
    let passwordDidNotMatch = tryExecSync(
      `docker logs f0d2c83247ec --tail 100 | grep Password\\ did\\ not\\ match`
    )
      .toString()
      .split(/\r?\n/);
    let couldNotMatchLogin = tryExecSync(
      `docker logs f0d2c83247ec --tail 100 | grep Could\\ not\\ find\\ a\\ login\\ matching`
    )
      .toString()
      .split(/\r?\n/);

    let ipRegex = /[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}/g;
    let ipsToBlockFromDockerLog = [];

    for (const line of passwordDidNotMatch) {
      var regexResult = line.match(ipRegex);
      if (!regexResult || regexResult.length < 3) continue;
      ipsToBlockFromDockerLog.push(regexResult[2]);
    }
    for (const line of couldNotMatchLogin) {
      var regexResult = line.match(ipRegex);
      if (!regexResult || regexResult.length < 3) continue;
      ipsToBlockFromDockerLog.push(regexResult[2]);
    }

    let ipsToBlockDistinct = [...new Set(ipsToBlockFromDockerLog)];

    for (const ip of ipsToBlockDistinct) {
      let ipTablesForIp = tryExecSync(`iptables -S | grep ${ip}`);

      ipTablesForIp = ipTablesForIp.toString().split(/\r?\n/);

      if (ipTablesForIp != "") {
        console.log(`${ip} - SKIPPING, already blocked`);
        continue;
      }

      let recentFailsCount = ipsToBlockFromDockerLog.filter((log) =>
        log.includes(ip)
      ).length;

      if (recentFailsCount < 6) {
        console.log(`${ip} - SKIPPING, only ${recentFailsCount} recently`);
        continue;
      }

      execSync(
        `iptables --insert DOCKER-USER --destination ${ip} --jump REJECT`
      );
      console.log(`${ip} - BLOCKED`);
    }

    nextInterval();
  }, 20000);
}

function tryExecSync(command) {
  try {
    return execSync(command);
  } catch {
    return "";
  }
}

nextInterval();
