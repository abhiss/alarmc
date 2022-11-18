import { TokenType } from './token_type.ts';

export class Token {
	type: TokenType;
	lexeme: string;
	literal?: unknown;
	line: number;

	constructor(
		type: TokenType,
		lexeme: string,
		literal: unknown | null,
		line: number,
	) {
		this.type = type;
		this.lexeme = lexeme;
		this.literal = literal;
		this.line = line;
	}

	toString(): string {
		return `Type (TT): ${
			TokenType[this.type]
		} | Literal: ${this.literal} | Lexeme: ${this.lexeme}`;
	}
}
