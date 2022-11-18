import { Parser } from './parser.ts';
import Scanner from './scanner.ts';
import { Token } from './token.ts';
import { TokenType } from './token_type.ts';
import { AstPrinter } from './AstPrinter.ts';
import { RuntimeError } from './runtime_error.ts';
import { Interpreter } from "./interpreter.ts";

let hadError = false;
let hadRuntimeError = false;
const interpreter = new Interpreter();
main(Deno.args);

function main(args: string[]) {
	if (args.length > 1) {
		console.log('Usage: tslox [script]');
	} else if (args.length == 1) {
		runFile(args[0]);
	} else {
		runPrompt();
	}
}

function runFile(path: string) {
	const file = Deno.readTextFileSync(path);
	run(file);
	if(hadError) Deno.exit(65);
	if(hadRuntimeError) Deno.exit(70);
}

function runPrompt() {
	for (;;) {
		const line = prompt('>');
		if (line == null) break;
		run(line);
		hadError = false;
	}
}

function run(source: string) {
	const scanner = new Scanner(source);
	const tokens: Token[] = scanner.scanTokens();

	const parser = new Parser(tokens);
	const statements = parser.parse();
	if (hadError) return;
	if (statements) { //book doesn't handle null like this.
		interpreter.interpret(statements);
	} else console.log('invalid expression.');
}

function report(line: number, where: string, message: string) {
	console.error(`[line ${line}] Error ${where}: ${message}`);
	hadError = true;
}

export function LoxError(token: Token | number, message: string) {
	if (typeof token == 'number') {
		report(token, 'at end', message);
	} else if (token.type == TokenType.EOF) {
		report(token.line, 'at end', message);
	} else {
		report(token.line, 'at \'' + token.lexeme + '\'', message);
	}
}

export function LoxRuntimeError(error:RuntimeError) {
	console.error(error.message, `[line: ${error.token.line}]`)
	hadRuntimeError = true;
}
