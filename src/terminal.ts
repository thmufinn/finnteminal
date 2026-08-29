import { FitAddon } from '@xterm/addon-fit';
import { Terminal as XTerminal } from '@xterm/xterm';

type ResizeHandler = (cols: number, rows: number) => void;

export default class Terminal {
  private readonly fitAddon = new FitAddon();
  private readonly xterm: XTerminal;
  private resizeHandler?: ResizeHandler;

  constructor() {
    this.xterm = new XTerminal({
      cursorBlink: true,
      scrollSensitivity: 2,
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: 12,
      lineHeight: 1.3,
      theme: {
        background: '#101214',
        foreground: '#00ff00',
        cursor: '#ffffff',
        cursorAccent: '#101214',
        selectionBackground: '#0000ff',
        selectionForeground: '#ffffff',
        black: '#000000',
        red: '#cd0000',
        green: '#00cd00',
        yellow: '#cdcd00',
        blue: '#0000ee',
        magenta: '#cd00cd',
        cyan: '#00cdcd',
        white: '#00ff00',
        brightBlack: '#7f7f7f',
        brightRed: '#ff0000',
        brightGreen: '#00ff00',
        brightYellow: '#ffff00',
        brightBlue: '#5c5cff',
        brightMagenta: '#ff00ff',
        brightCyan: '#00ffff',
        brightWhite: '#7ee787',
      },
    });

    this.xterm.loadAddon(this.fitAddon);
  }

  open(container: HTMLDivElement) {
    this.xterm.open(container);
    this.xterm.focus();
  }

  fit() {
    this.fitAddon.fit();
  }

  focus() {
    this.xterm.focus();
  }

  onInput(handler: (data: string) => void) {
    this.xterm.onData(handler);
  }

  onResize(handler: ResizeHandler) {
    this.resizeHandler = handler;
    this.xterm.onResize(({ cols, rows }) => handler(cols, rows));
  }

  reportSize() {
    this.resizeHandler?.(this.xterm.cols, this.xterm.rows);
  }

  write(data: string) {
    this.xterm.write(data);
  }

  clear() {
    this.xterm.clear();
  }

  dispose() {
    this.xterm.dispose();
  }
}
