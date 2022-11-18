import { Token } from './token.ts';
import { TokenType as TT } from './token_type.ts';
import { LoxError } from './main.ts';

export default class Scanner {
	private source: string;
	public tokens: Token[] = [];
	private start = 0;
	private current = 0;
	private line = 1;

	private readonly Keywords = new Map<string, TT>([
		['and', TT.AND],
		['class', TT.CLASS],
		['else', TT.ELSE],
		['false', TT.FALSE],
		['for', TT.FOR],
		['fun', TT.FUN],
		['if', TT.IF],
		['nil', TT.NIL],
		['or', TT.OR],
		['print', TT.PRINT],
		['return', TT.RETURN],
		['super', TT.SUPER],
		['this', TT.THIS],
		['true', TT.TRUE],
		['var', TT.VAR],
		['while', TT.WHILE],
	]);

	constructor(source: string) {
		this.source = source;
		// this.tokens = source.split(/\s/).filter((e) => e != "");
	}

	scanTokens(): Token[] {
		this.isAtEnd();
		while (!this.isAtEnd()) {
			// we are at the beginning of the next lexeme.
			this.start = this.current;
			this.scanToken();
		}
		this.tokens.push(new Token(TT.EOF, '', null, this.line));
		return this.tokens;
	}

	private scanToken() {
		const char: string = this.advance();
		switch (char) {
			case '(':
				this.addToken(TT.LEFT_PAREN);
				break;

			case ')':
				this.addToken(TT.RIGHT_PAREN);
				break;

			case '{':
				this.addToken(TT.LEFT_BRACE);
				break;

			case '}':
				this.addToken(TT.RIGHT_BRACE);
				break;

			case ',':
				this.addToken(TT.COMMA);
				break;

			case '.':
				this.addToken(TT.DOT);
				break;

			case '-':
				this.addToken(TT.MINUS);
				break;

			case '+':
				this.addToken(TT.PLUS);
				break;

			case ';':
				this.addToken(TT.SEMICOLON);
				break;

			case '*':
				this.addToken(TT.STAR);
				break;

			case '!':
				this.addToken(this.match('=') ? TT.BANG_EQUAL : TT.BANG);
				break;

			case '=':
				this.addToken(this.match('=') ? TT.EQUAL_EQUAL : TT.EQUAL);
				break;

			case '<':
				this.addToken(this.match('=') ? TT.LESS_EQUAL : TT.LESS);
				break;

			case '>':
				this.addToken(this.match('=') ? TT.GREATER_EQUAL : TT.GREATER);
				break;

			case '/':
				if (this.match('/')) {
					// A comment goes until the end of the line.
					// we don't add comments as tokens
					while (this.peek() != '\n' && !this.isAtEnd()) this.advance();
				} else {
					this.addToken(TT.SLASH);
				}
				break;

			case ' ':
			case '\r':
			case '\t':
				//ignore whitespace
				break;

			case '\n':
				this.line++;
				break;

			case '"':
				this.string_literal();
				break;

			default:
				if (this.isDigit(char)) {
					this.number_literal();
				} else if (this.isAlpha(char)) {
					this.identifier();
				} else {
					LoxError(this.line, 'Unexpected character.');
				}
				break;
		}
	}
	private identifier() {
		while (this.isAlphaNumeric(this.peek())) this.advance();

		const text = this.source.substring(this.start, this.current);
		let token_type = this.Keywords.get(text);
		if (token_type == undefined) token_type = TT.IDENTIFIER;
		this.addToken(token_type);
	}

	private number_literal() {
		while (this.isDigit(this.peek())) this.advance();

		// Look for fractional part.
		if (this.peek() == '.' && this.isDigit(this.peekNext())) {
			// Consume the "."
			this.advance();
			while (this.isDigit(this.peek())) this.advance();
		}
		this.addToken(
			TT.NUMBER,
			parseFloat(this.source.substring(this.start, this.current)),
		);
	}

	private string_literal() {
		while (this.peek() != '"' && !this.isAtEnd()) {
			if (this.peek() == '\n') this.line++;
			this.advance();
		}

		if (this.isAtEnd()) {
			LoxError(this.line, 'Unterminated string.');
			return;
		}

		// The closing
		this.advance();

		// Trim the surrounding quotes.
		const value = this.source.substring(this.start + 1, this.current - 1);
		this.addToken(TT.STRING, value);
	}

	private match(expected: string): boolean {
		console.assert(expected.length == 1);
		if (this.isAtEnd()) return false;
		if (this.source.charAt(this.current) != expected) return false;

		this.current++;
		return true;
	}

	private peek(): string {
		if (this.isAtEnd()) return '\0';
		return this.source.charAt(this.current);
	}

	private peekNext(): string {
		if (this.current + 1 >= this.source.length) return '\0';
		else return this.source.charAt(this.current + 1);
	}

	// true if c is a letter or _
	private isAlpha(c: string): boolean {
		return (c >= 'a' && c <= 'z') ||
			(c >= 'A' && c <= 'Z') ||
			c == '_';
	}

	private isAlphaNumeric(c: string): boolean {
		return this.isAlpha(c) || this.isDigit(c);
	}

	private isDigit(c: string): boolean {
		// console.assert(c.length == 1);
		return c >= '0' && c <= '9';
	}

	private isAtEnd(): boolean {
		return this.current >= this.source.length;
	}

	//for input
	private advance(): string {
		return this.source[this.current++];
	}

	//for output
	private addToken(type: TT, literal: unknown | null = null) {
		const text: string = this.source.substring(this.start, this.current);
		this.tokens.push(new Token(type, text, literal, this.line));
	}
}
