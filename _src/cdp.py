"""Tiny Chrome DevTools Protocol client (standard library only).

Starts its own headless Chrome with a throw-away profile, so the user's normal
browser and sign-ins are never touched.
"""
import base64
import json
import os
import socket
import struct
import subprocess
import time
import urllib.request

CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'


class WebSocket:
    def __init__(self, url):
        host_port, path = url[len('ws://'):].split('/', 1)
        host, port = host_port.split(':')
        self.sock = socket.create_connection((host, int(port)))
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((
            f'GET /{path} HTTP/1.1\r\nHost: {host_port}\r\nUpgrade: websocket\r\n'
            f'Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'
        ).encode())
        self.buf = bytearray()
        while b'\r\n\r\n' not in self.buf:
            self.buf += self.sock.recv(4096)
        head, _, rest = bytes(self.buf).partition(b'\r\n\r\n')
        if b' 101 ' not in head.split(b'\r\n')[0]:
            raise RuntimeError(head.decode(errors='replace'))
        self.buf = bytearray(rest)

    def _frame(self, opcode, data):
        mask = os.urandom(4)
        n = len(data)
        hdr = bytearray([0x80 | opcode])
        if n < 126:
            hdr.append(0x80 | n)
        elif n < 65536:
            hdr.append(0x80 | 126)
            hdr += struct.pack('>H', n)
        else:
            hdr.append(0x80 | 127)
            hdr += struct.pack('>Q', n)
        body = bytearray(data)
        for i in range(n):
            body[i] ^= mask[i & 3]
        self.sock.sendall(bytes(hdr) + mask + bytes(body))

    def send(self, text):
        self._frame(0x1, text.encode())

    def _read(self, n):
        while len(self.buf) < n:
            chunk = self.sock.recv(1 << 20)
            if not chunk:
                raise EOFError('websocket closed')
            self.buf += chunk
        out = bytes(self.buf[:n])
        del self.buf[:n]
        return out

    def recv(self):
        msg = bytearray()
        while True:
            b0, b1 = self._read(2)
            op, fin = b0 & 0x0F, b0 & 0x80
            n = b1 & 0x7F
            if n == 126:
                n = struct.unpack('>H', self._read(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._read(8))[0]
            mask = self._read(4) if b1 & 0x80 else None
            payload = bytearray(self._read(n))
            if mask:
                for i in range(n):
                    payload[i] ^= mask[i & 3]
            if op == 0x9:  # ping
                self._frame(0xA, bytes(payload))
                continue
            if op == 0x8:
                raise EOFError('websocket closed by Chrome')
            if op in (0x0, 0x1, 0x2):
                msg += payload
                if fin:
                    return msg.decode()


class Chrome:
    def __init__(self, profile_dir, port=9333, width=1440, height=693):
        self.proc = subprocess.Popen([
            CHROME, '--headless=new', f'--remote-debugging-port={port}', f'--user-data-dir={profile_dir}',
            '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
            '--disable-extensions', '--remote-allow-origins=*', f'--window-size={width},{height}',
            '--force-color-profile=srgb', 'about:blank',
        ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        base = f'http://127.0.0.1:{port}'
        for _ in range(100):
            try:
                pages = json.load(urllib.request.urlopen(f'{base}/json/list', timeout=1))
                page = next(p for p in pages if p['type'] == 'page')
                break
            except Exception:
                time.sleep(0.2)
        else:
            raise RuntimeError('Chrome did not start')
        self.ws = WebSocket(page['webSocketDebuggerUrl'])
        self.mid = 0

    def call(self, method, **params):
        self.mid += 1
        mid = self.mid
        self.ws.send(json.dumps({'id': mid, 'method': method, 'params': params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get('id') == mid:
                if 'error' in m:
                    raise RuntimeError(f"{method}: {m['error']}")
                return m.get('result', {})

    def js(self, expr):
        r = self.call('Runtime.evaluate', expression=expr, returnByValue=True, awaitPromise=True)
        if 'exceptionDetails' in r:
            raise RuntimeError(f"JS error: {r['exceptionDetails'].get('exception', {}).get('description') or r['exceptionDetails']}")
        return r['result'].get('value')

    def close(self):
        try:
            self.call('Browser.close')
        except Exception:
            pass
        try:
            self.proc.wait(timeout=5)
        except Exception:
            self.proc.kill()
