function generatePacScript(hostname, proxyHost, proxyPort, proxyType = 'SOCKS5', proxyAllResources = true) {
  // 根据代理类型生成不同的代理字符串
  let proxyString;
  switch (proxyType.toUpperCase()) {
    case 'SOCKS':
    case 'SOCKS5':
      proxyString = `SOCKS5 ${proxyHost}:${proxyPort}`;
      break;
    case 'SOCKS4':
      proxyString = `SOCKS ${proxyHost}:${proxyPort}`;
      break;
    case 'HTTP':
    default:
      proxyString = `PROXY ${proxyHost}:${proxyPort}`;
      break;
  }

  if (proxyAllResources) {
    // 为所有请求使用代理
    return `function FindProxyForURL(url, host) {
      return "${proxyString}";
    }`;
  } else {
    // 只为特定域名使用代理
    return `function FindProxyForURL(url, host) {
      if (host === "${hostname}" || host.endsWith(".${hostname}")) {
        return "${proxyString}";
      }
      return "DIRECT";
    }`;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'set_global_direct') {
    chrome.proxy.settings.set(
      {
        value: {
          mode: "direct"
        },
        scope: 'regular'
      },
      () => {
        console.log("Switched to direct mode");
      }
    );
  } else if (message.action === 'set_global_proxy') {
    chrome.proxy.settings.set(
      {
        value: {
          mode: "system"
        },
        scope: 'regular'
      },
      () => {
        console.log("Switched to system proxy mode");
      }
    );
  } else if (message.action === 'set_current_proxy') {
    // 调用 generatePacScript 

    const pacScriptContent = generatePacScript(
      message.host,
      message.proxyHost,
      message.proxyPort,
      message.proxyType, // 添加代理类型参数
      true // 默认为所有资源使用代理
    );

    console.log(pacScriptContent);

    chrome.proxy.settings.set(
      {
        value: {
          mode: "pac_script",
          pacScript: {
            data: pacScriptContent
          }
        },
        scope: 'regular'
      },
      () => {
        console.log("Switched to PAC mode");
      }
    );
  } else if (message.action === 'set_go_direct') {
    // 获取当前系统的代理设置，以便在特定域名之外使用
    chrome.proxy.settings.get({}, function (config) {
      let defaultProxyString = "DIRECT"; // 默认回退值

      // 如果用户有设置全局代理，获取该代理配置
      if (message.defaultProxyHost && message.defaultProxyPort) {
        let proxyType = message.defaultProxyType || 'SOCKS5';
        switch (proxyType.toUpperCase()) {
          case 'SOCKS':
          case 'SOCKS5':
            defaultProxyString = `SOCKS5 ${message.defaultProxyHost}:${message.defaultProxyPort}`;
            break;
          case 'SOCKS4':
            defaultProxyString = `SOCKS ${message.defaultProxyHost}:${message.defaultProxyPort}`;
            break;
          case 'HTTP':
          default:
            defaultProxyString = `PROXY ${message.defaultProxyHost}:${message.defaultProxyPort}`;
            break;
        }
      }

      // 生成只对特定网站使用直接连接的PAC脚本
      const pacScriptContent = `function FindProxyForURL(url, host) {
        if (host === "${message.host}" || host.endsWith(".${message.host}")) {
          return "DIRECT";
        }
        return "${defaultProxyString}";
      }`;

      console.log(pacScriptContent);

      chrome.proxy.settings.set(
        {
          value: {
            mode: "pac_script",
            pacScript: {
              data: pacScriptContent
            }
          },
          scope: 'regular'
        },
        () => {
          console.log("Set direct connection for specific site");
        }
      );
    });
  }
});
