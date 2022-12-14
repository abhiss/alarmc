export enum TokenType {
	// single-character tokens.
	LEFT_PAREN,
	RIGHT_PAREN,
	LEFT_BRACE,
	RIGHT_BRACE,
	COMMA,
	DOT,
	MINUS,
	PLUS,
	SEMICOLON,
	COLON,
	SLASH,
	STAR,

	// 1 or 2 character tokens.
	BANG,
	BANG_EQUAL,
	EQUAL,
	EQUAL_EQUAL,
	GREATER,
	GREATER_EQUAL,
	LESS,
	LESS_EQUAL,

	// literals.
	IDENTIFIER,
	STRING,
	NUMBER,

	// keywords.
	AND,
	CLASS,
	ELSE,
	FALSE,
	FUN,
	FOR,
	IF,
	NIL,
	OR,
	GOTO,
	LABEL,
	RETURN,
	SUPER,
	THIS,
	TRUE,
	VAR,
	WHILE,
	PRINT,

	EOF,
	SENTINEL
}
