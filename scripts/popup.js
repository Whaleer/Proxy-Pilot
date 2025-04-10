// 函数：更新按钮样式以反映当前选中状态
function updateButtonStyles(activeMode, specificSite) {
  // 重置所有按钮样式
  document.getElementById('directBtn').style.backgroundColor = '#f1f3f5';
  document.getElementById('directBtn').style.color = '#333';
  document.getElementById('directBtn').querySelector('i').style.color = '#555';
  
  document.getElementById('systemBtn').style.backgroundColor = '#f1f3f5';
  document.getElementById('systemBtn').style.color = '#333';
  document.getElementById('systemBtn').querySelector('i').style.color = '#555';
  
  document.getElementById('proxyBtn').style.backgroundColor = '#f1f3f5';
  document.getElementById('proxyBtn').style.color = '#333';
  document.getElementById('proxyBtn').querySelector('i').style.color = '#555';
  
  document.getElementById('goDirectBtn').style.backgroundColor = '#f1f3f5';
  document.getElementById('goDirectBtn').style.color = '#333';
  document.getElementById('goDirectBtn').querySelector('i').style.color = '#555';
  
  // 设置活动按钮样式
  if (activeMode === 'direct') {
    document.getElementById('directBtn').style.backgroundColor = '#e2fadb';
    document.getElementById('directBtn').style.color = '#2b7016';
    document.getElementById('directBtn').querySelector('i').style.color = '#2b7016';
  } else if (activeMode === 'system') {
    document.getElementById('systemBtn').style.backgroundColor = '#e2fadb';
    document.getElementById('systemBtn').style.color = '#2b7016';
    document.getElementById('systemBtn').querySelector('i').style.color = '#2b7016';
  } else if (activeMode === 'pac_script') {
    // 显示下拉菜单
    document.querySelector('.dropdown-options').style.display = 'block';
    
    // 高亮相应按钮
    if (specificSite === 'proxy') {
      document.getElementById('proxyBtn').style.backgroundColor = '#e2fadb';
      document.getElementById('proxyBtn').style.color = '#2b7016';
      document.getElementById('proxyBtn').querySelector('i').style.color = '#2b7016';
    } else if (specificSite === 'direct') {
      document.getElementById('goDirectBtn').style.backgroundColor = '#e2fadb';
      document.getElementById('goDirectBtn').style.color = '#2b7016';
      document.getElementById('goDirectBtn').querySelector('i').style.color = '#2b7016';
    }
    
    // 也要高亮Auto Switch按钮
    document.getElementById('autoSwitchBtn').style.backgroundColor = '#e7f5ff';
    document.getElementById('autoSwitchBtn').style.color = '#1971c2';
    document.getElementById('autoSwitchBtn').querySelector('i').style.color = '#1971c2';
  }
}

// 在popup打开时获取当前代理状态
function getCurrentProxyState() {
  chrome.proxy.settings.get({'incognito': false}, function(config) {
    const mode = config.value.mode;
    if (mode === 'direct') {
      updateButtonStyles('direct');
    } else if (mode === 'system') {
      updateButtonStyles('system');
    } else if (mode === 'pac_script') {
      // 检查PAC脚本的内容来确定是哪种特定站点设置
      const pacScript = config.value.pacScript.data;
      
      // 获取当前标签页hostname，以判断当前站点是使用代理还是直连
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs && tabs.length > 0) {
          const currentTab = tabs[0];
          const url = new URL(currentTab.url);
          const hostname = url.hostname;
          
          // 简单判断：如果PAC脚本中包含DIRECT和当前域名，则是"Go Direct"模式
          if (pacScript.includes(`host === "${hostname}"`) && pacScript.includes('DIRECT')) {
            updateButtonStyles('pac_script', 'direct');
          } else {
            updateButtonStyles('pac_script', 'proxy');
          }
        }
      });
    }
  });
}

// 当popup打开时检查状态
document.addEventListener('DOMContentLoaded', function() {
  getCurrentProxyState();
});

// 更新点击事件处理器
document.getElementById('systemBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'set_global_proxy' });
  updateButtonStyles('system');
});

document.getElementById('directBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'set_global_direct' });
  updateButtonStyles('direct');
});

document.getElementById('proxyBtn').addEventListener('click', () => {
  // 获取当前活动标签页并提取hostname
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs.length > 0) {
      const currentTab = tabs[0];
      const url = new URL(currentTab.url);
      const hostname = url.hostname;
      
      chrome.runtime.sendMessage({
        action: 'set_current_proxy',
        host: hostname,
        proxyHost: '127.0.0.1',
        proxyPort: '6153',
        proxyType: 'SOCKS5'
      });
      
      updateButtonStyles('pac_script', 'proxy');
    }
  });
});

document.getElementById('goDirectBtn').addEventListener('click', () => {
  // 获取当前活动标签页并提取hostname
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs && tabs.length > 0) {
      const currentTab = tabs[0];
      const url = new URL(currentTab.url);
      const hostname = url.hostname;
      
      // 向background.js发送消息，包含当前域名
      chrome.runtime.sendMessage({
        action: 'set_go_direct',
        host: hostname,
        // 可选：添加默认代理配置，当不是指定域名时使用
        // defaultProxyHost: '127.0.0.1',
        // defaultProxyPort: '6153',
        // defaultProxyType: 'SOCKS5'
      });
      
      updateButtonStyles('pac_script', 'direct');
    }
  });
});

document.getElementById('autoSwitchBtn').addEventListener('click', () => {
  // Toggle dropdown visibility
  const dropdownOptions = document.querySelector('.dropdown-options');
  if (dropdownOptions.style.display === 'block') {
    dropdownOptions.style.display = 'none';
  } else {
    dropdownOptions.style.display = 'block';
  }
  
  // 不再发送无意义的set_auto_switch消息
  // chrome.runtime.sendMessage({ action: 'set_auto_switch' });
});
