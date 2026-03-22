# mmm Programming Language & mmm_L IDE

> **mmm Programming Language** — A Korean esoteric programming language inspired by 엄랭.
> `mmm_L` is the IDE for mmm Programming Language. (L = Language)

> 🤖 **This entire project — the language, interpreter, and IDE — was fully built by [Claude Code](https://claude.ai/claude-code) (Anthropic).**

---

## Features of mmm Programming Language

- Every statement must end with `~`.
- Use `print(value)~` to print output.
- Strings use single quotes `'like this'` or double quotes `"like this"`.
- `print(1 + 1)~` → outputs `2`.
- Variable names cannot start with a number.
- All other syntax uses long, confusing Korean keywords (esoteric style).

---

## Keywords

| Keyword | Role |
|---|---|
| `변수야나와라 name = value~` | Variable declaration |
| `print(value)~` | Print output (the only easy thing) |
| `이봐만약에(condition)~` | if statement |
| `아니면어쩔건데~` | else |
| `이봐끝났어~` | end if |
| `반복해라(N)~` | for loop (N times) |
| `반복끝~` | end for |
| `계속해라(condition)~` | while loop |
| `그만해~` | end while |
| `참` | true |
| `거짓` | false |
| `그리고` | and |
| `아니면` | or |
| `부정` | not |

---

## Example

```mmm
# Variable declaration
변수야나와라 name = 'World'~
print('Hello, ' + name)~

# For loop
반복해라(3)~
    print('Repeating!')~
반복끝~

# If statement
변수야나와라 score = 85~
이봐만약에(score >= 80)~
    print('Pass!')~
아니면어쩔건데~
    print('Fail!')~
이봐끝났어~

# While loop
변수야나와라 i = 1~
계속해라(i <= 5)~
    print(i)~
    변수야나와라 i = i + 1~
그만해~
```

---

## Running mmm_L IDE

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build (current platform)
npm run build

# Build Windows exe
npm run build:win

# Build macOS
npm run build:mac
```

> **Offline support**: The built app works fully without an internet connection.

---

## Windows Download

Download the latest release from the [Releases page](../../releases):

| File | Description |
|------|-------------|
| `mmm_L Setup *.exe` | Installer (recommended) |
| `mmm_L *.exe` | Portable — run without installing |

---

## File Extension

mmm Programming Language files use the `.mmm` extension.

---

*If you did not read this README, that is entirely your fault.*
