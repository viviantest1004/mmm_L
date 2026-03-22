'use strict';

// ─── DOM 요소 ─────────────────────────────────────
const editor       = document.getElementById('editor');
const lineNumbers  = document.getElementById('line-numbers');
const output       = document.getElementById('output');
const statusLeft   = document.getElementById('statusbar-left');
const statusCursor = document.getElementById('status-cursor');
const tabLabel     = document.getElementById('tab-label');
const modalOverlay = document.getElementById('modal-overlay');
const modalBody    = document.getElementById('modal-body');

// ─── 상태 ─────────────────────────────────────────
let isDirty = false;

// ─── 기본 예제 코드 ───────────────────────────────
const DEFAULT_CODE = `# ══════════════════════════════════
# mmm Programming Language — Example Program
# Every statement MUST end with '~'
# ══════════════════════════════════

# 1. Print
print('Hello, mmm Programming Language!')~
print(1 + 1)~
print(10 * 5 - 3)~

# 2. Variables
변수야나와라 name = 'World'~
변수야나와라 age = 20~
print(name)~
print(age)~

# 3. String concat
변수야나와라 greeting = 'Hello, ' + name + '!'~
print(greeting)~

# 4. For loop
반복해라(3)~
    print('Repeating!')~
반복끝~

# 5. If statement
변수야나와라 score = 85~
이봐만약에(score >= 90)~
    print('A grade')~
아니면어쩔건데~
    이봐만약에(score >= 80)~
        print('B grade')~
    아니면어쩔건데~
        print('C or below')~
    이봐끝났어~
이봐끝났어~

# 6. While loop
변수야나와라 i = 1~
계속해라(i <= 5)~
    print(i)~
    변수야나와라 i = i + 1~
그만해~

print('Done!')~
`;

// ─── 초기화 ──────────────────────────────────────
editor.value = DEFAULT_CODE;
updateLineNumbers();
setStatus('Ready — Press F5 or ▶ Run to execute code.');
termInit();

// ─── 줄 번호 ─────────────────────────────────────
function updateLineNumbers() {
  const lines = editor.value.split('\n');
  lineNumbers.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');
}

editor.addEventListener('scroll', () => {
  lineNumbers.scrollTop = editor.scrollTop;
});

// ─── 에디터 이벤트 ────────────────────────────────
editor.addEventListener('input', () => {
  updateLineNumbers();
  markDirty();
});

editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = editor.selectionStart;
    const before = editor.value.substring(0, s);
    const after  = editor.value.substring(editor.selectionEnd);
    editor.value = before + '    ' + after;
    editor.selectionStart = editor.selectionEnd = s + 4;
    updateLineNumbers();
    markDirty();
  }
  if (e.key === 'F5')                                    { e.preventDefault(); runCode(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 's')        { e.preventDefault(); e.shiftKey ? saveAs() : save(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'o')        { e.preventDefault(); openFile(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n')        { e.preventDefault(); newFile(); }
});

editor.addEventListener('click',  updateCursor);
editor.addEventListener('keyup',  updateCursor);

function updateCursor() {
  const val   = editor.value.substring(0, editor.selectionStart);
  const lines = val.split('\n');
  statusCursor.textContent = `Line ${lines.length}, Col ${lines[lines.length - 1].length + 1}`;
}

// ─── 파일 관리 ────────────────────────────────────
function markDirty() {
  if (!isDirty) {
    isDirty = true;
    if (!tabLabel.textContent.startsWith('* ')) {
      tabLabel.textContent = '* ' + tabLabel.textContent;
    }
  }
}

function markClean() {
  isDirty = false;
  tabLabel.textContent = tabLabel.textContent.replace(/^\* /, '');
}

function newFile() {
  editor.value = '';
  tabLabel.textContent = 'untitled.mmm';
  isDirty = false;
  clearOutput();
  updateLineNumbers();
  setStatus('New file created.');
}

async function openFile() {
  const result = await window.mmmAPI.openFile();
  // file-opened event handles the rest
}

async function save() {
  const result = await window.mmmAPI.saveFile(editor.value);
  if (result && result.success) {
    const name = result.path.split(/[\\/]/).pop();
    tabLabel.textContent = name;
    markClean();
    setStatus(`Saved: ${result.path}`);
  }
}

async function saveAs() {
  const result = await window.mmmAPI.saveFileAs(editor.value);
  if (result && result.success) {
    const name = result.path.split(/[\\/]/).pop();
    tabLabel.textContent = name;
    markClean();
    setStatus(`Saved: ${result.path}`);
  }
}

// ─── 메뉴/IPC 액션 수신 ───────────────────────────
window.mmmAPI.onAction((action) => {
  switch (action) {
    case 'new':    newFile();     break;
    case 'save':   save();        break;
    case 'saveAs': saveAs();      break;
    case 'run':    runCode();     break;
    case 'clear':  clearOutput(); break;
    case 'help':   showHelp();    break;
  }
});

window.mmmAPI.onFileOpened(({ path: filePath, content }) => {
  editor.value = content;
  const name = filePath.split(/[\\/]/).pop();
  tabLabel.textContent = name;
  markClean();
  updateLineNumbers();
  clearOutput();
  setStatus(`Opened: ${filePath}`);
});

// ─── 코드 실행 ────────────────────────────────────
async function runCode() {
  const code     = editor.value;
  const filename = tabLabel.textContent.replace(/^\* /, '') || 'untitled.mmm';

  termPrint('');
  termPrompt(filename);

  if (!code.trim()) {
    termError('Error: The code is empty. Please write something.');
    setStatus('No code to run.');
    output.scrollTop = output.scrollHeight;
    return;
  }

  setStatus('Running...');
  const start  = Date.now();
  const result = await window.mmmAPI.runCode(code);
  const elapsed = Date.now() - start;

  if (result.output) {
    for (const line of result.output.split('\n')) {
      termPrint(line);
    }
  }

  termPrint('');
  if (result.success) {
    termSuccess(`Process exited with code 0  (${elapsed}ms)`);
    setStatus(`Done — ${elapsed}ms`);
  } else {
    for (const line of result.error.split('\n')) {
      termError(line);
    }
    termPrint('');
    termWarning(`Process exited with code 1  (${elapsed}ms)`);
    setStatus('Error — check the terminal.');
  }

  output.scrollTop = output.scrollHeight;
}

// ─── 터미널 유틸 ──────────────────────────────────
function termInit() {
  termInfo('mmm_L  [Version 1.0.0] — mmm Programming Language IDE');
  termInfo('(c) mmm Programming Language Foundation. All rights reserved.');
  termPrint('');
  termInfo('Press F5 or click ▶ Run to execute mmm code.');
}

function termPrompt(label) {
  const div  = document.createElement('div');
  div.className = 'out-prompt';
  div.textContent = 'C:\\mmm_L> ';
  const span = document.createElement('span');
  span.className   = 'out-cmd';
  span.textContent = 'mmm ' + label;
  div.appendChild(span);
  output.appendChild(div);
}

function termPrint(text)   { appendLine(text, 'out-normal');  }
function termError(text)   { appendLine(text, 'out-error');   }
function termSuccess(text) { appendLine(text, 'out-success'); }
function termWarning(text) { appendLine(text, 'out-warning'); }
function termInfo(text)    { appendLine(text, 'out-info');    }

function appendLine(text, cls) {
  const div = document.createElement('div');
  div.className   = cls;
  div.textContent = text;
  output.appendChild(div);
}

function clearOutput() {
  output.innerHTML = '';
  termInit();
}

function setStatus(msg) {
  statusLeft.textContent = msg;
}

// ─── 버튼 이벤트 ──────────────────────────────────
document.getElementById('btn-new').addEventListener('click',   newFile);
document.getElementById('btn-open').addEventListener('click',  openFile);
document.getElementById('btn-save').addEventListener('click',  save);
document.getElementById('btn-run').addEventListener('click',   runCode);
document.getElementById('btn-clear').addEventListener('click', clearOutput);
document.getElementById('btn-help').addEventListener('click',  showHelp);
document.addEventListener('keydown', (e) => {
  if (e.key === 'F1')     { e.preventDefault(); showHelp(); }
  if (e.key === 'Escape') { modalOverlay.classList.remove('visible'); }
});

// ─── 도움말 ───────────────────────────────────────
function showHelp() {
  modalBody.innerHTML = buildHelpHTML();
  modalOverlay.classList.add('visible');
}

document.getElementById('modal-close').addEventListener('click', () => {
  modalOverlay.classList.remove('visible');
});
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.remove('visible');
});

function buildHelpHTML() {
  const h  = (s) => `<span class="hd">${s}</span>`;
  const kw = (s) => `<span class="kw">${s}</span>`;
  const st = (s) => `<span class="st">${s}</span>`;
  const nm = (s) => `<span class="nm">${s}</span>`;
  const cm = (s) => `<span class="cm">${s}</span>`;
  const hl = (s) => `<span class="hl">${s}</span>`;

  return `${h('╔══════════════════════════════════════════════════╗')}
${h('║  mmm Programming Language — Official Spec v1.0  ║')}
${h('╚══════════════════════════════════════════════════╝')}

${cm('# You MUST read this before writing any code.')}
${cm('# Every statement MUST end with ~')}
${cm('# Exception: a single print() line does NOT need ~')}

${h('━━━ 1. Print ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('print')}(value)${hl('~')}
  ${kw('print')}(${st("'Hello!'")})${hl('~')}         ${cm('→ Hello!')}
  ${kw('print')}(${nm('1')} + ${nm('1')})${hl('~')}           ${cm('→ 2')}
  ${kw('print')}(${st("'Score: '")} + ${nm('100')})${hl('~')}  ${cm('→ Score: 100')}

  ${cm('★ Single line: ~ is optional')}
  ${kw('print')}(${st("'Hello'")})   ${cm('← works without ~')}

${h('━━━ 2. Variables ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('변수야나와라')} name = value${hl('~')}
  ${kw('변수야나와라')} x = ${nm('10')}${hl('~')}
  ${kw('변수야나와라')} name = ${st("'Kim'")}${hl('~')}

  ${cm('※ Variable names cannot start with a number!')}

${h('━━━ 3. Data Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  Numbers:  ${nm('42')}, ${nm('3.14')}, ${nm('-7')}
  Strings:  ${st("'single quotes'")} or ${st('"double quotes"')}
  Boolean:  ${kw('참')} (true), ${kw('거짓')} (false)

${h('━━━ 4. Operators ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  Arithmetic:  +  -  *  /  %
  Comparison:  ==  !=  <  >  <=  >=
  Logic:       ${kw('그리고')} (and)  ${kw('아니면')} (or)  ${kw('부정')} (not)
  String:      ${st("'a'")} + ${st("'b'")} = ${st("'ab'")}

${h('━━━ 5. If Statement ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('이봐만약에')}(condition)${hl('~')}
      command${hl('~')}
  ${kw('아니면어쩔건데')}${hl('~')}    ${cm('← else (optional)')}
      command${hl('~')}
  ${kw('이봐끝났어')}${hl('~')}        ${cm('← REQUIRED!')}

${h('━━━ 6. For Loop (N times) ━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('반복해라')}(N)${hl('~')}
      command${hl('~')}
  ${kw('반복끝')}${hl('~')}

${h('━━━ 7. While Loop ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('계속해라')}(condition)${hl('~')}
      command${hl('~')}
  ${kw('그만해')}${hl('~')}            ${cm('← REQUIRED!')}

${h('━━━ 8. Comments ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${cm('# single line comment')}
  ${cm('// also a comment')}

${h('━━━ 9. Keywords ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('변수야나와라')}   variable declaration
  ${kw('print')}          print output
  ${kw('이봐만약에')}     if
  ${kw('아니면어쩔건데')} else
  ${kw('이봐끝났어')}     end if
  ${kw('반복해라')}       for loop
  ${kw('반복끝')}         end for
  ${kw('계속해라')}       while loop
  ${kw('그만해')}         end while
  ${kw('참')}             true
  ${kw('거짓')}           false
  ${kw('그리고')}         and
  ${kw('아니면')}         or
  ${kw('부정')}           not

${h('══════════════════════════════════════════════════')}
${cm('If you have read this, you are now a certified mmm developer.')}
${h('══════════════════════════════════════════════════')}
`;
}
