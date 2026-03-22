'use strict';
const { ipcRenderer } = require('electron');
const { Interpreter } = require('./mmm-interpreter.js');

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

# 2. 변수 선언 (변수야나와라 키워드 사용)
변수야나와라 이름 = '홍길동'~
변수야나와라 나이 = 20~
print(이름)~
print(나이)~

# 3. 문자열 합치기
변수야나와라 인사 = '제 이름은 ' + 이름 + '입니다.'~
print(인사)~

# 4. 반복문 (반복해라/반복끝)
반복해라(3)~
    print('세 번 반복합니다!')~
반복끝~

# 5. 조건문 (이봐만약에/아니면어쩔건데/이봐끝났어)
변수야나와라 점수 = 85~
이봐만약에(점수 >= 90)~
    print('A 학점 입니다.')~
아니면어쩔건데~
    이봐만약에(점수 >= 80)~
        print('B 학점 입니다.')~
    아니면어쩔건데~
        print('C 이하 학점 입니다.')~
    이봐끝났어~
이봐끝났어~

# 6. while 반복문 (계속해라/그만해)
변수야나와라 카운트 = 1~
계속해라(카운트 <= 5)~
    print(카운트)~
    변수야나와라 카운트 = 카운트 + 1~
그만해~

print('프로그램 실행 완료!')~
`;

// ─── 초기화 ──────────────────────────────────────
editor.value = DEFAULT_CODE;
updateLineNumbers();
setStatus('준비 완료. F5 또는 ▶ 실행 버튼을 누르면 코드가 실행됩니다.');

// 터미널 초기 메시지 (CMD 스타일)
termInfo('mmm_L  [Version 1.0.0] — mmm Programming Language IDE');
termInfo('(c) mmm Programming Language Foundation. All rights reserved.');
termPrint('');
termInfo('F5 또는 ▶ 실행 버튼으로 mmm 코드를 실행하십시오.');

// ─── 줄 번호 갱신 ─────────────────────────────────
function updateLineNumbers() {
  const lines = editor.value.split('\n');
  lineNumbers.innerHTML = lines
    .map((_, i) => `<div>${i + 1}</div>`)
    .join('');
}

// 스크롤 동기화
editor.addEventListener('scroll', () => {
  lineNumbers.scrollTop = editor.scrollTop;
});

// ─── 에디터 이벤트 ────────────────────────────────
editor.addEventListener('input', () => {
  updateLineNumbers();
  markDirty();
});

editor.addEventListener('keydown', (e) => {
  // Tab 키 → 공백 4칸
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end   = editor.selectionEnd;
    const before = editor.value.substring(0, start);
    const after  = editor.value.substring(end);
    editor.value = before + '    ' + after;
    editor.selectionStart = editor.selectionEnd = start + 4;
    updateLineNumbers();
    markDirty();
  }

  // F5 → 실행
  if (e.key === 'F5') {
    e.preventDefault();
    runCode();
  }

  // Ctrl+S / Cmd+S → 저장
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (e.shiftKey) saveAs();
    else save();
  }

  // Ctrl+O → 열기
  if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
    e.preventDefault();
    // ipcRenderer로 요청 (main process에서 dialog 처리)
    ipcRenderer.send('open-file-request');
  }

  // Ctrl+N → 새 파일
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    newFile();
  }
});

// 커서 위치 갱신
editor.addEventListener('click',   updateCursor);
editor.addEventListener('keyup',   updateCursor);
editor.addEventListener('select',  updateCursor);

function updateCursor() {
  const val   = editor.value.substring(0, editor.selectionStart);
  const lines = val.split('\n');
  const line  = lines.length;
  const col   = lines[lines.length - 1].length + 1;
  statusCursor.textContent = `줄 ${line}, 열 ${col}`;
}

// ─── 파일 관리 ────────────────────────────────────
function markDirty() {
  if (!isDirty) {
    isDirty = true;
    tabLabel.textContent = tabLabel.textContent.replace(/^\* ?/, '* ');
  }
}

function markClean() {
  isDirty = false;
  tabLabel.textContent = tabLabel.textContent.replace(/^\* /, '');
}

function newFile() {
  editor.value = '';
  tabLabel.textContent = '제목없음.mmm';
  isDirty = false;
  ipcRenderer.send('reset-filepath');
  ipcRenderer.send('set-title', null);
  clearOutput();
  updateLineNumbers();
  setStatus('새 파일을 만들었습니다.');
}

async function save() {
  const result = await ipcRenderer.invoke('save-file', { content: editor.value });
  if (result.success) {
    const name = result.path.split(/[\\/]/).pop();
    tabLabel.textContent = name;
    markClean();
    setStatus(`저장 완료: ${result.path}`);
  }
}

async function saveAs() {
  const result = await ipcRenderer.invoke('save-file-as', { content: editor.value });
  if (result.success) {
    const name = result.path.split(/[\\/]/).pop();
    tabLabel.textContent = name;
    markClean();
    setStatus(`저장 완료: ${result.path}`);
  }
}

// main → renderer 메시지 수신
ipcRenderer.on('file-opened', (event, { path: filePath, content }) => {
  editor.value = content;
  const name = filePath.split(/[\\/]/).pop();
  tabLabel.textContent = name;
  markClean();
  updateLineNumbers();
  clearOutput();
  setStatus(`열기 완료: ${filePath}`);
});

ipcRenderer.on('action', (event, action) => {
  switch (action) {
    case 'new':    newFile(); break;
    case 'save':   save();    break;
    case 'saveAs': saveAs();  break;
    case 'run':    runCode(); break;
    case 'clear':  clearOutput(); break;
    case 'help':   showHelp(); break;
  }
});

// ─── 코드 실행 ────────────────────────────────────
function runCode() {
  const code = editor.value;
  const filename = tabLabel.textContent.replace(/^\* /, '') || 'untitled.mmm';

  termPrint(''); // 빈 줄
  termPrompt(`mmm ${filename}`);  // C:\mmm_L> 스타일 프롬프트
  termCmd('mmm ' + filename);

  if (!code.trim()) {
    termError("오류: 코드가 비어 있습니다. 뭔가를 입력하십시오!");
    setStatus('코드 없음');
    output.scrollTop = output.scrollHeight;
    return;
  }

  setStatus('실행 중...');

  const interp = new Interpreter();
  const start  = Date.now();
  const result = interp.run(code);
  const elapsed = Date.now() - start;

  // 출력 결과
  if (result.output) {
    for (const line of result.output.split('\n')) {
      termPrint(line);
    }
  }

  if (result.success) {
    termPrint('');
    termSuccess(`프로세스 완료, 종료 코드 0  (${elapsed}ms)`);
    setStatus(`실행 완료 — ${elapsed}ms`);
  } else {
    termPrint('');
    // 에러를 줄별로 분리해서 표시
    for (const line of result.error.split('\n')) {
      termError(line);
    }
    termPrint('');
    termWarning(`프로세스 실패, 종료 코드 1  (${elapsed}ms)`);
    setStatus('오류 발생 — 터미널을 확인하세요');
  }

  output.scrollTop = output.scrollHeight;
}

// ─── 터미널 출력 유틸 ─────────────────────────────
function termPrint(text)   { appendOutput(text, 'out-normal'); }
function termError(text)   { appendOutput(text, 'out-error'); }
function termSuccess(text) { appendOutput(text, 'out-success'); }
function termWarning(text) { appendOutput(text, 'out-warning'); }
function termInfo(text)    { appendOutput(text, 'out-info'); }

function termPrompt(label) {
  // C:\mmm_L> 스타일
  const div = document.createElement('div');
  div.className = 'out-prompt';
  div.textContent = `C:\\mmm_L> `;
  const span = document.createElement('span');
  span.className = 'out-cmd';
  span.textContent = label;
  div.appendChild(span);
  output.appendChild(div);
}

function termCmd(text) {
  // 명령어만 따로 (프롬프트 없이)
}

function appendOutput(text, cls = 'out-normal') {
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text;
  output.appendChild(div);
}

function clearOutput() {
  // cls 명령처럼 화면 지우기
  output.innerHTML = '';
  termInfo('Microsoft mmm_L  [버전 1.0.0]');
  termInfo('(c) mmm 언어 재단. All rights reserved.');
  termPrint('');
}

function setStatus(msg) {
  statusLeft.textContent = msg;
}

// ─── 버튼 이벤트 ──────────────────────────────────
document.getElementById('btn-new').addEventListener('click',   newFile);
document.getElementById('btn-open').addEventListener('click',  () => ipcRenderer.send('open-file-request'));
document.getElementById('btn-save').addEventListener('click',  save);
document.getElementById('btn-run').addEventListener('click',   runCode);
document.getElementById('btn-clear').addEventListener('click', clearOutput);
document.getElementById('btn-help').addEventListener('click',  showHelp);

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
document.addEventListener('keydown', (e) => {
  if (e.key === 'F1') { e.preventDefault(); showHelp(); }
  if (e.key === 'Escape') modalOverlay.classList.remove('visible');
});

function buildHelpHTML() {
  const h = (s) => `<span class="hd">${s}</span>`;
  const kw = (s) => `<span class="kw">${s}</span>`;
  const st = (s) => `<span class="st">${s}</span>`;
  const nm = (s) => `<span class="nm">${s}</span>`;
  const cm = (s) => `<span class="cm">${s}</span>`;
  const hl = (s) => `<span class="hl">${s}</span>`;

  return `${h('╔══════════════════════════════════════════════════╗')}
${h('║  mmm Programming Language — Official Spec v1.0  ║')}
${h('╚══════════════════════════════════════════════════╝')}

${cm('# 이 문서를 읽지 않으면 프로그래밍이 불가능합니다.')}
${cm('# 모든 문장은 반드시 ~ 로 끝나야 합니다!')}

${h('━━━ 1. 출력 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('print')}(값)${hl('~')}
  ${kw('print')}(${st("'문자열'")})${hl('~')}
  ${kw('print')}(${nm('1')} + ${nm('1')})${hl('~')}      ${cm('→ 2 출력')}
  ${kw('print')}(변수명)${hl('~')}

${h('━━━ 2. 변수 선언 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('변수야나와라')} 이름 = 값${hl('~')}
  ${kw('변수야나와라')} x = ${nm('10')}${hl('~')}
  ${kw('변수야나와라')} 이름 = ${st("'홍길동'")})${hl('~')}

  ${cm('※ 변수 이름은 숫자로 시작할 수 없습니다!')}
  ${cm('※ 재선언으로 값을 변경할 수 있습니다.')}

${h('━━━ 3. 자료형 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  숫자:   ${nm('42')}, ${nm('3.14')}, ${nm('-7')}
  문자열: ${st("'작은 따옴표'")} 또는 ${st('"큰 따옴표"')}
  불리언: ${kw('참')} (true), ${kw('거짓')} (false)

${h('━━━ 4. 연산자 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  산술:   +  -  *  /  %
  비교:   ==  !=  <  >  <=  >=
  논리:   ${kw('그리고')} (and)  ${kw('아니면')} (or)  ${kw('부정')} (not)
  문자열: ${st("'가'")} + ${st("'나'")} = ${st("'가나'")}  (합치기)

${h('━━━ 5. 조건문 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('이봐만약에')}(조건)${hl('~')}
      명령${hl('~')}
  ${kw('아니면어쩔건데')}${hl('~')}        ${cm('← else (생략 가능)')}
      명령${hl('~')}
  ${kw('이봐끝났어')}${hl('~')}            ${cm('← 반드시 닫아야 합니다!')}

${h('━━━ 6. for 반복문 (N번 반복) ━━━━━━━━━━━━━━━━━━━')}

  ${kw('반복해라')}(횟수)${hl('~')}
      명령${hl('~')}
  ${kw('반복끝')}${hl('~')}

${h('━━━ 7. while 반복문 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('계속해라')}(조건)${hl('~')}
      명령${hl('~')}
  ${kw('그만해')}${hl('~')}

${h('━━━ 8. 주석 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${cm('# 이것은 주석입니다')}
  ${cm('// 이것도 주석입니다')}

${h('━━━ 9. 키워드 목록 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

  ${kw('변수야나와라')}  — 변수 선언
  ${kw('print')}         — 출력 (유일하게 쉬운 것)
  ${kw('이봐만약에')}    — if
  ${kw('아니면어쩔건데')}— else
  ${kw('이봐끝났어')}    — end if
  ${kw('반복해라')}      — for
  ${kw('반복끝')}        — end for
  ${kw('계속해라')}      — while
  ${kw('그만해')}        — end while
  ${kw('참')}            — true
  ${kw('거짓')}          — false
  ${kw('그리고')}        — and
  ${kw('아니면')}        — or
  ${kw('부정')}          — not

${h('━━━ 10. 완전한 예제 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${cm('# 1부터 10까지 짝수 출력')}
${kw('변수야나와라')} i = ${nm('1')}${hl('~')}
${kw('계속해라')}(i <= ${nm('10')})${hl('~')}
    ${kw('이봐만약에')}(i % ${nm('2')} == ${nm('0')})${hl('~')}
        ${kw('print')}(i)${hl('~')}
    ${kw('이봐끝났어')}${hl('~')}
    ${kw('변수야나와라')} i = i + ${nm('1')}${hl('~')}
${kw('그만해')}${hl('~')}

${h('══════════════════════════════════════════════')}
${cm('이 명세서를 외울 때까지 코딩하지 마십시오.')}
${h('══════════════════════════════════════════════')}
`;
}
