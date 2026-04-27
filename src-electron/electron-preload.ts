import { webFrame, contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  capturePage: (rect: any) => ipcRenderer.invoke('capture-page', rect)
});

// This script will run in the main window AND inside every cross-origin iframe
// because we enabled nodeIntegrationInSubFrames in electron-main.ts.

webFrame.executeJavaScript(`
  (function() {
    // Only spoof the screen object if we are inside an iframe (a game view)
    if (window.top === window.self) return;

    // Many games (like Play'n GO) check window.screen.width/height or screen.orientation
    // instead of window.innerWidth. We force the screen object to exactly match the iframe's size!
    Object.defineProperty(window, 'screen', {
      get: function() {
        return {
          width: window.innerWidth,
          height: window.innerHeight,
          availWidth: window.innerWidth,
          availHeight: window.innerHeight,
          orientation: {
            type: window.innerWidth > window.innerHeight ? 'landscape-primary' : 'portrait-primary',
            angle: 0,
            onchange: null,
            addEventListener: function(){},
            removeEventListener: function(){},
            dispatchEvent: function(){return false;}
          },
          colorDepth: 24,
          pixelDepth: 24
        };
      }
    });
  })();
`);
