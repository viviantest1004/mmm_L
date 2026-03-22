// ===================================================
// mmm Programming Language — Interpreter v1.0
// Do NOT modify this file unless you know what you are doing.
// ===================================================

'use strict';

// ─── 토큰 타입 ───────────────────────────────────────
const TT = {
  NUMBER: 'NUMBER',
  STRING: 'STRING',
  IDENTIFIER: 'IDENTIFIER',
  PLUS: '+',
  MINUS: '-',
  STAR: '*',
  SLASH: '/',
  PERCENT: '%',
  ASSIGN: '=',
  EQ: '==',
  NEQ: '!=',
  LT: '<',
  GT: '>',
  LEQ: '<=',
  GEQ: '>=',
  LPAREN: '(',
  RPAREN: ')',
  TILDE: '~',
  EOF: 'EOF',
  // 키워드 (한국어)
  KW_VAR:     '변수야나와라',
  KW_PRINT:   'print',
  KW_IF:      '이봐만약에',
  KW_ELSE:    '아니면어쩔건데',
  KW_ENDIF:   '이봐끝났어',
  KW_WHILE:   '계속해라',
  KW_ENDWHILE:'그만해',
  KW_FOR:     '반복해라',
  KW_ENDFOR:  '반복끝',
  KW_TRUE:    '참',
  KW_FALSE:   '거짓',
  KW_AND:     '그리고',
  KW_OR:      '아니면',
  KW_NOT:     '부정',
};

const KEYWORDS = new Map([
  ['변수야나와라',    TT.KW_VAR],
  ['print',          TT.KW_PRINT],
  ['이봐만약에',     TT.KW_IF],
  ['아니면어쩔건데', TT.KW_ELSE],
  ['이봐끝났어',     TT.KW_ENDIF],
  ['계속해라',       TT.KW_WHILE],
  ['그만해',         TT.KW_ENDWHILE],
  ['반복해라',       TT.KW_FOR],
  ['반복끝',         TT.KW_ENDFOR],
  ['참',             TT.KW_TRUE],
  ['거짓',           TT.KW_FALSE],
  ['그리고',         TT.KW_AND],
  ['아니면',         TT.KW_OR],
  ['부정',           TT.KW_NOT],
]);

// ─── 에러 클래스 ──────────────────────────────────────
class MmmError extends Error {
  constructor(msg, line) {
    const lineInfo = line != null ? `[${line}번째 줄 오류] ` : '';
    super(lineInfo + msg);
    this.mmmLine = line;
  }
}

// ─── 토큰 ────────────────────────────────────────────
class Token {
  constructor(type, value, line) {
    this.type = type;
    this.value = value;
    this.line = line;
  }
}

// ─── 렉서 ────────────────────────────────────────────
class Lexer {
  constructor(source) {
    this.src = source;
    this.pos = 0;
    this.line = 1;
  }

  ch() { return this.src[this.pos]; }
  peek(n = 1) { return this.src[this.pos + n]; }

  advance() {
    const c = this.src[this.pos++];
    if (c === '\n') this.line++;
    return c;
  }

  isDigit(c) { return c >= '0' && c <= '9'; }

  // 한국어, 영문자, 밑줄 포함
  isIdentStart(c) {
    if (!c) return false;
    return /[a-zA-Z_\uAC00-\uD7A3\u3131-\u314E\u314F-\u3163]/.test(c);
  }

  isIdentPart(c) {
    if (!c) return false;
    return /[a-zA-Z0-9_\uAC00-\uD7A3\u3131-\u314E\u314F-\u3163]/.test(c);
  }

  skipWhitespaceAndNewlines() {
    while (this.pos < this.src.length) {
      const c = this.ch();
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        this.advance();
      } else if (c === '#') {
        // 줄 주석
        while (this.pos < this.src.length && this.ch() !== '\n') this.advance();
      } else if (c === '/' && this.peek() === '/') {
        while (this.pos < this.src.length && this.ch() !== '\n') this.advance();
      } else {
        break;
      }
    }
  }

  readNumber(line) {
    let num = '';
    while (this.pos < this.src.length && (this.isDigit(this.ch()) || this.ch() === '.')) {
      if (this.ch() === '.') {
        if (num.includes('.')) break;
        if (!this.isDigit(this.peek())) break;
      }
      num += this.advance();
    }
    return new Token(TT.NUMBER, parseFloat(num), line);
  }

  readString(quote, line) {
    this.advance(); // 여는 따옴표 건너뜀
    let str = '';
    while (this.pos < this.src.length && this.ch() !== quote) {
      if (this.ch() === '\n') {
        throw new MmmError(
          `문자열 안에서 줄바꿈을 하셨습니다! 따옴표를 닫은 다음에 줄바꿈 하세요. 기초중의 기초입니다!`,
          line
        );
      }
      if (this.ch() === '\\') {
        this.advance();
        const esc = this.advance();
        switch (esc) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case "'": str += "'"; break;
          case '"': str += '"'; break;
          case '\\': str += '\\'; break;
          default: str += '\\' + esc;
        }
      } else {
        str += this.advance();
      }
    }
    if (this.pos >= this.src.length) {
      throw new MmmError(
        `따옴표를 닫지 않으셨습니다! '${quote}'으로 문자열을 끝내야 합니다! 얼마나 말해야 알겠습니까?`,
        line
      );
    }
    this.advance(); // 닫는 따옴표 건너뜀
    return new Token(TT.STRING, str, line);
  }

  readIdentOrKeyword(line) {
    let ident = '';
    while (this.pos < this.src.length && this.isIdentPart(this.ch())) {
      ident += this.advance();
    }
    const kwType = KEYWORDS.get(ident);
    if (kwType) {
      return new Token(kwType, ident, line);
    }
    return new Token(TT.IDENTIFIER, ident, line);
  }

  tokenize() {
    const tokens = [];
    while (true) {
      this.skipWhitespaceAndNewlines();
      if (this.pos >= this.src.length) break;

      const line = this.line;
      const c = this.ch();

      if (this.isDigit(c)) {
        tokens.push(this.readNumber(line));
        continue;
      }

      if (c === "'" || c === '"') {
        tokens.push(this.readString(c, line));
        continue;
      }

      if (this.isIdentStart(c)) {
        tokens.push(this.readIdentOrKeyword(line));
        continue;
      }

      // 2글자 연산자 먼저
      const two = c + (this.peek() || '');
      if (two === '==') { this.advance(); this.advance(); tokens.push(new Token(TT.EQ,  '==', line)); continue; }
      if (two === '!=') { this.advance(); this.advance(); tokens.push(new Token(TT.NEQ, '!=', line)); continue; }
      if (two === '<=') { this.advance(); this.advance(); tokens.push(new Token(TT.LEQ, '<=', line)); continue; }
      if (two === '>=') { this.advance(); this.advance(); tokens.push(new Token(TT.GEQ, '>=', line)); continue; }

      // 1글자 연산자
      switch (c) {
        case '+': this.advance(); tokens.push(new Token(TT.PLUS,    '+', line)); break;
        case '-': this.advance(); tokens.push(new Token(TT.MINUS,   '-', line)); break;
        case '*': this.advance(); tokens.push(new Token(TT.STAR,    '*', line)); break;
        case '/': this.advance(); tokens.push(new Token(TT.SLASH,   '/', line)); break;
        case '%': this.advance(); tokens.push(new Token(TT.PERCENT, '%', line)); break;
        case '=': this.advance(); tokens.push(new Token(TT.ASSIGN,  '=', line)); break;
        case '<': this.advance(); tokens.push(new Token(TT.LT,      '<', line)); break;
        case '>': this.advance(); tokens.push(new Token(TT.GT,      '>', line)); break;
        case '(': this.advance(); tokens.push(new Token(TT.LPAREN,  '(', line)); break;
        case ')': this.advance(); tokens.push(new Token(TT.RPAREN,  ')', line)); break;
        case '~': this.advance(); tokens.push(new Token(TT.TILDE,   '~', line)); break;
        default:
          throw new MmmError(
            `'${c}' 이런 문자는 mmm Programming Language에 존재하지 않습니다! 키보드를 닦고 다시 확인하십시오!`,
            line
          );
      }
    }
    tokens.push(new Token(TT.EOF, null, this.line));
    return tokens;
  }
}

// ─── 파서 ────────────────────────────────────────────
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  cur() { return this.tokens[this.pos]; }
  peek(n = 1) { return this.tokens[this.pos + n] || this.tokens[this.tokens.length - 1]; }

  advance() {
    const t = this.tokens[this.pos];
    if (this.pos < this.tokens.length - 1) this.pos++;
    return t;
  }

  expect(type, hint) {
    const t = this.cur();
    if (t.type !== type) {
      const what = hint || `'${type}'`;
      throw new MmmError(
        `${what}이(가) 와야 하는데 '${t.value ?? t.type}'이(가) 왔습니다. 문법을 다시 공부하세요!`,
        t.line
      );
    }
    return this.advance();
  }

  expectTilde(stmtName) {
    const t = this.cur();
    if (t.type !== TT.TILDE) {
      throw new MmmError(
        `'${stmtName}' 다음에 반드시 '~'를 붙여야 합니다! ` +
        `'~' 없이 문장을 끝내는 행위는 mmm Programming Language에서 용납되지 않습니다! ` +
        `현재 토큰: '${t.value ?? t.type}'`,
        t.line
      );
    }
    return this.advance();
  }

  // print에서만 쓰는 ~ 선택적 소비: EOF 앞이면 생략 가능
  optionalTildeForPrint() {
    const t = this.cur();
    if (t.type === TT.TILDE) this.advance();
    // EOF이면 ~ 없어도 ok (print 단독 한 줄 사용 허용)
  }

  parse() {
    const body = [];
    while (this.cur().type !== TT.EOF) {
      body.push(this.parseStatement());
    }
    return { type: 'Program', body };
  }

  parseStatement() {
    const t = this.cur();
    switch (t.type) {
      case TT.KW_VAR:    return this.parseVarDecl();
      case TT.KW_PRINT:  return this.parsePrint();
      case TT.KW_IF:     return this.parseIf();
      case TT.KW_WHILE:  return this.parseWhile();
      case TT.KW_FOR:    return this.parseFor();
      default:
        throw new MmmError(
          `'${t.value ?? t.type}'은(는) 문장을 시작할 수 없습니다! ` +
          `문장은 반드시 올바른 키워드로 시작해야 합니다! ` +
          `명세서를 100번 읽고 오세요!`,
          t.line
        );
    }
  }

  parseVarDecl() {
    const line = this.cur().line;
    this.advance(); // '변수야나와라'

    const nameTok = this.cur();
    if (nameTok.type !== TT.IDENTIFIER) {
      throw new MmmError(
        `'변수야나와라' 다음에 변수 이름이 와야 합니다! ` +
        `지금 온 것: '${nameTok.value ?? nameTok.type}'. 변수 이름이 뭔지 아십니까?`,
        nameTok.line
      );
    }

    // 변수명이 숫자로 시작하는지 확인 (렉서가 이미 IDENTIFIER로 분류했겠지만 확인)
    if (/^[0-9]/.test(nameTok.value)) {
      throw new MmmError(
        `변수 이름 '${nameTok.value}'은(는) 숫자로 시작할 수 없습니다! ` +
        `1학년 때 배운 거 아닙니까? 변수는 문자로 시작해야 합니다!`,
        nameTok.line
      );
    }

    this.advance(); // 변수명
    this.expect(TT.ASSIGN, "'='");

    const value = this.parseExpr();
    this.expectTilde(`변수야나와라 ${nameTok.value} = ...`);

    return { type: 'VarDecl', name: nameTok.value, value, line };
  }

  parsePrint() {
    const line = this.cur().line;
    this.advance(); // 'print'
    this.expect(TT.LPAREN, "'('");
    const expr = this.parseExpr();
    this.expect(TT.RPAREN, "')'");
    // print는 한 문장만 있을 때 ~ 생략 가능 (EOF 바로 앞이면 ok)
    this.optionalTildeForPrint();
    return { type: 'Print', expr, line };
  }

  parseIf() {
    const line = this.cur().line;
    this.advance(); // '이봐만약에'
    this.expect(TT.LPAREN, "'('");
    const cond = this.parseExpr();
    this.expect(TT.RPAREN, "')'");
    this.expectTilde('이봐만약에(...)');

    const thenBody = [];
    while (
      this.cur().type !== TT.KW_ELSE &&
      this.cur().type !== TT.KW_ENDIF &&
      this.cur().type !== TT.EOF
    ) {
      thenBody.push(this.parseStatement());
    }

    let elseBody = [];
    if (this.cur().type === TT.KW_ELSE) {
      this.advance();
      this.expectTilde('아니면어쩔건데');
      while (this.cur().type !== TT.KW_ENDIF && this.cur().type !== TT.EOF) {
        elseBody.push(this.parseStatement());
      }
    }

    if (this.cur().type !== TT.KW_ENDIF) {
      throw new MmmError(
        `'이봐만약에'를 열었으면 '이봐끝났어~'로 닫아야 합니다! ` +
        `시작이 있으면 끝도 있는 법입니다! 상식입니다!`,
        line
      );
    }
    this.advance(); // '이봐끝났어'
    this.expectTilde('이봐끝났어');

    return { type: 'If', cond, thenBody, elseBody, line };
  }

  parseWhile() {
    const line = this.cur().line;
    this.advance(); // '계속해라'
    this.expect(TT.LPAREN, "'('");
    const cond = this.parseExpr();
    this.expect(TT.RPAREN, "')'");
    this.expectTilde('계속해라(...)');

    const body = [];
    while (this.cur().type !== TT.KW_ENDWHILE && this.cur().type !== TT.EOF) {
      body.push(this.parseStatement());
    }

    if (this.cur().type !== TT.KW_ENDWHILE) {
      throw new MmmError(
        `'계속해라'를 열었으면 '그만해~'로 닫아야 합니다! ` +
        `계속만 하고 그만할 줄 모르시는 겁니까?`,
        line
      );
    }
    this.advance(); // '그만해'
    this.expectTilde('그만해');

    return { type: 'While', cond, body, line };
  }

  parseFor() {
    const line = this.cur().line;
    this.advance(); // '반복해라'
    this.expect(TT.LPAREN, "'('");
    const count = this.parseExpr();
    this.expect(TT.RPAREN, "')'");
    this.expectTilde('반복해라(...)');

    const body = [];
    while (this.cur().type !== TT.KW_ENDFOR && this.cur().type !== TT.EOF) {
      body.push(this.parseStatement());
    }

    if (this.cur().type !== TT.KW_ENDFOR) {
      throw new MmmError(
        `'반복해라'를 열었으면 '반복끝~'으로 닫아야 합니다! ` +
        `몇 번이나 말씀드려야 하겠습니까?`,
        line
      );
    }
    this.advance(); // '반복끝'
    this.expectTilde('반복끝');

    return { type: 'For', count, body, line };
  }

  // ─── 표현식 파싱 (연산자 우선순위) ─────────────────
  parseExpr() { return this.parseOr(); }

  parseOr() {
    let left = this.parseAnd();
    while (this.cur().type === TT.KW_OR) {
      this.advance();
      const right = this.parseAnd();
      left = { type: 'BinOp', op: 'or', left, right };
    }
    return left;
  }

  parseAnd() {
    let left = this.parseCmp();
    while (this.cur().type === TT.KW_AND) {
      this.advance();
      const right = this.parseCmp();
      left = { type: 'BinOp', op: 'and', left, right };
    }
    return left;
  }

  parseCmp() {
    let left = this.parseAdd();
    const cmpOps = [TT.EQ, TT.NEQ, TT.LT, TT.GT, TT.LEQ, TT.GEQ];
    while (cmpOps.includes(this.cur().type)) {
      const op = this.advance().value;
      const right = this.parseAdd();
      left = { type: 'BinOp', op, left, right };
    }
    return left;
  }

  parseAdd() {
    let left = this.parseMul();
    while (this.cur().type === TT.PLUS || this.cur().type === TT.MINUS) {
      const op = this.advance().value;
      const right = this.parseMul();
      left = { type: 'BinOp', op, left, right };
    }
    return left;
  }

  parseMul() {
    let left = this.parseUnary();
    while ([TT.STAR, TT.SLASH, TT.PERCENT].includes(this.cur().type)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      left = { type: 'BinOp', op, left, right };
    }
    return left;
  }

  parseUnary() {
    if (this.cur().type === TT.KW_NOT) {
      const line = this.cur().line;
      this.advance();
      return { type: 'UnaryOp', op: 'not', expr: this.parseUnary(), line };
    }
    if (this.cur().type === TT.MINUS) {
      const line = this.cur().line;
      this.advance();
      return { type: 'UnaryOp', op: 'neg', expr: this.parseUnary(), line };
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const t = this.cur();

    if (t.type === TT.NUMBER) {
      this.advance();
      return { type: 'Num', val: t.value, line: t.line };
    }
    if (t.type === TT.STRING) {
      this.advance();
      return { type: 'Str', val: t.value, line: t.line };
    }
    if (t.type === TT.KW_TRUE) {
      this.advance();
      return { type: 'Bool', val: true, line: t.line };
    }
    if (t.type === TT.KW_FALSE) {
      this.advance();
      return { type: 'Bool', val: false, line: t.line };
    }
    if (t.type === TT.IDENTIFIER) {
      this.advance();
      return { type: 'Var', name: t.value, line: t.line };
    }
    if (t.type === TT.LPAREN) {
      this.advance();
      const expr = this.parseExpr();
      this.expect(TT.RPAREN, "')'");
      return expr;
    }

    throw new MmmError(
      `'${t.value ?? t.type}'은(는) 값으로 사용할 수 없습니다! ` +
      `숫자, 문자열, 변수, 또는 '(식)'만 값이 될 수 있습니다! ` +
      `이것도 모르십니까?`,
      t.line
    );
  }
}

// ─── 인터프리터 ──────────────────────────────────────
class Interpreter {
  constructor() {
    this.vars = new Map();
    this.output = [];
    this.stepCount = 0;
    this.MAX_STEPS = 100000;
  }

  step() {
    if (++this.stepCount > this.MAX_STEPS) {
      throw new MmmError(
        `프로그램이 ${this.MAX_STEPS}번 이상 실행되었습니다! ` +
        `무한루프를 돌리고 계신 건 아닙니까? 제발 끝이 있는 프로그램을 작성하십시오!`
      );
    }
  }

  run(code) {
    this.vars = new Map();
    this.output = [];
    this.stepCount = 0;

    if (!code || !code.trim()) {
      return { success: true, output: '' };
    }

    try {
      const lexer = new Lexer(code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();
      this.execProgram(ast);
      return { success: true, output: this.output.join('\n') };
    } catch (e) {
      return {
        success: false,
        error: e.message || '알 수 없는 오류',
        output: this.output.join('\n'),
      };
    }
  }

  execProgram(ast) {
    for (const stmt of ast.body) this.execStmt(stmt);
  }

  execStmt(stmt) {
    this.step();
    switch (stmt.type) {
      case 'VarDecl': {
        const val = this.eval(stmt.value);
        this.vars.set(stmt.name, val);
        break;
      }
      case 'Print': {
        const val = this.eval(stmt.expr);
        this.output.push(this.toDisplay(val));
        break;
      }
      case 'If': {
        const cond = this.eval(stmt.cond);
        const branch = this.isTruthy(cond) ? stmt.thenBody : stmt.elseBody;
        for (const s of branch) this.execStmt(s);
        break;
      }
      case 'While': {
        while (this.isTruthy(this.eval(stmt.cond))) {
          this.step();
          for (const s of stmt.body) this.execStmt(s);
        }
        break;
      }
      case 'For': {
        const n = this.eval(stmt.count);
        if (typeof n !== 'number' || !Number.isFinite(n)) {
          throw new MmmError(
            `'반복해라'의 반복 횟수는 유한한 숫자여야 합니다! '${n}'은 숫자가 아닙니다!`,
            stmt.line
          );
        }
        const count = Math.floor(n);
        if (count < 0) {
          throw new MmmError(
            `반복 횟수가 음수(${count})입니다! 음수 번 반복이라는 게 말이 됩니까?`,
            stmt.line
          );
        }
        for (let i = 0; i < count; i++) {
          this.step();
          for (const s of stmt.body) this.execStmt(s);
        }
        break;
      }
      default:
        throw new MmmError(`알 수 없는 구문 유형: ${stmt.type}`);
    }
  }

  eval(node) {
    this.step();
    switch (node.type) {
      case 'Num':  return node.val;
      case 'Str':  return node.val;
      case 'Bool': return node.val;

      case 'Var': {
        if (!this.vars.has(node.name)) {
          throw new MmmError(
            `변수 '${node.name}'이(가) 선언되지 않았습니다! ` +
            `'변수야나와라 ${node.name} = 값~'으로 먼저 선언하십시오! ` +
            `없는 변수를 쓰면 어떻게 됩니까? 이렇게 됩니다!`,
            node.line
          );
        }
        return this.vars.get(node.name);
      }

      case 'UnaryOp': {
        const v = this.eval(node.expr);
        if (node.op === 'not') return !this.isTruthy(v);
        if (node.op === 'neg') {
          if (typeof v !== 'number') {
            throw new MmmError(
              `숫자가 아닌 것에 마이너스를 붙이실 생각이십니까? '${v}'는 숫자가 아닙니다!`,
              node.line
            );
          }
          return -v;
        }
        break;
      }

      case 'BinOp': {
        if (node.op === 'and') {
          return this.isTruthy(this.eval(node.left)) && this.isTruthy(this.eval(node.right));
        }
        if (node.op === 'or') {
          return this.isTruthy(this.eval(node.left)) || this.isTruthy(this.eval(node.right));
        }

        const L = this.eval(node.left);
        const R = this.eval(node.right);

        switch (node.op) {
          case '+':
            if (typeof L === 'string' || typeof R === 'string') {
              return String(this.toDisplay(L)) + String(this.toDisplay(R));
            }
            return L + R;
          case '-':
            this.requireNum(L, R, '-', node.line);
            return L - R;
          case '*':
            this.requireNum(L, R, '*', node.line);
            return L * R;
          case '/':
            this.requireNum(L, R, '/', node.line);
            if (R === 0) throw new MmmError('0으로 나누는 행위는 수학적으로 불가능합니다! 수학을 공부하십시오!', node.line);
            return L / R;
          case '%':
            this.requireNum(L, R, '%', node.line);
            if (R === 0) throw new MmmError('0으로 나머지를 구하는 행위는 불가합니다!', node.line);
            return L % R;
          case '==': return L === R;
          case '!=': return L !== R;
          case '<':  return L < R;
          case '>':  return L > R;
          case '<=': return L <= R;
          case '>=': return L >= R;
          default:
            throw new MmmError(`알 수 없는 연산자: '${node.op}'`);
        }
      }

      default:
        throw new MmmError(`알 수 없는 노드: ${node.type}`);
    }
  }

  isTruthy(v) {
    if (v === false || v === null || v === undefined) return false;
    if (v === 0) return false;
    if (v === '') return false;
    return true;
  }

  toDisplay(v) {
    if (v === true) return '참';
    if (v === false) return '거짓';
    if (typeof v === 'number') {
      // 정수면 정수로 표시
      if (Number.isInteger(v)) return String(v);
      return String(v);
    }
    return String(v);
  }

  requireNum(L, R, op, line) {
    if (typeof L !== 'number' || typeof R !== 'number') {
      throw new MmmError(
        `'${op}' 연산은 숫자 두 개 사이에서만 가능합니다! ` +
        `왼쪽: '${L}' (${typeof L}), 오른쪽: '${R}' (${typeof R}). ` +
        `숫자가 뭔지는 아시죠?`,
        line
      );
    }
  }
}

// CommonJS 내보내기
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Interpreter, MmmError };
}
