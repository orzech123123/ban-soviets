const { execSync } = require("child_process");

function nextInterval() {
  setTimeout(function () {
    let passwordDidNotMatch = execSync(
      `docker logs 364c44949241 --tail 100 | grep Password\\ did\\ not\\ match`
    )
      .toString()
      .split(/\r?\n/);
    let couldNotMatchLogin = execSync(
      `docker logs 364c44949241 --tail 100 | grep Could\\ not\\ find\\ a\\ login\\ matching`
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
      let ipTablesForIp = "";
      try {
        ipTablesForIp = execSync(`iptables -S | grep ${ip}`);
      } catch {}

      ipTablesForIp = ipTablesForIp.toString().split(/\r?\n/);

      if (ipTablesForIp != "") {
        console.log(`${ip} - SKIPPING, already blocked`);
        continue;
      }

      let recentFailsCount = ipsToBlockFromDockerLog.filter((log) =>
        log.includes(ip)
      ).length;

      if (recentFailsCount < 10) {
        console.log(`${ip} - SKIPPING, only ${recentFailsCount} recently`);
        continue;
      }

      execSync(`iptables --insert DOCKER-USER --destination ${ip} --jump REJECT`)
      console.log(`${ip} - BLOCKED`);
    }

    nextInterval();
  }, 30000);
}

nextInterval();
