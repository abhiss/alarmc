import { Parser } from './parser.ts';
import Scanner from './scanner.ts';
import { Token } from './token.ts';
import { TokenType } from './token_type.ts';
import { AstPrinter } from './AstPrinter.ts';
import { RuntimeError } from './runtime_error.ts';
import { Interpreter } from './interpreter.ts';
import { CodeGen } from './codegen.ts';
import { Label, Stmt } from './Stmt.ts';
import { LoweringVisitor } from './lower.ts';

let hadError = false;
let hadRuntimeError = false;
const interpreter = new Interpreter();
main(Deno.args);

function main(args: string[]) {
    if (args.length == 2) {
        runFile(args[0], args[1]);
    } else {
        // runPrompt();
        console.log('Usage: tslox [script]');
    }
}

function runFile(path: string, out_path: string) {
    const file = Deno.readTextFileSync(path);
    let asm = run(file);
    if (asm == null) throw Error('An error occured :(');
    Deno.writeTextFileSync(out_path, asm);

    if (hadError) Deno.exit(65);
    if (hadRuntimeError) Deno.exit(70);
}

//returns the generated assembly code
function run(source: string): string | null {
    const scanner = new Scanner(source);
    const tokens: Token[] = scanner.scanTokens();

    const parser = new Parser(tokens);
	const lowerer = new LoweringVisitor();

    const unlowered_statements = parser.parse();
    if (hadError) return null; //means parser errored
    // console.log(JSON.stringify(statements, null, 4))
    console.log(Deno.inspect(unlowered_statements, { depth: 10, colors: true }));

	const statements = lowerer.lower(unlowered_statements as Stmt[]);

    const codegen = new CodeGen();
    let total_gen = '';
    for (let i in statements) {
        const s = statements[i];
        total_gen += `\n; statement: ${i}\n`;
        total_gen += s?.accept(codegen);
    }
    let asm = `mov r0 1\nmov r6 0\n${total_gen}\nhalt\n`;

    return asm.split('\n').map((e) => e.trimStart()).join('\n'); //remove leading whitespace (tabs and stuff)

    // if (statements) { //book doesn't handle null like this.
    // 	// interpreter.interpret(statements);
    // } else console.log('invalid expression.');
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

export function LoxRuntimeError(error: RuntimeError) {
    console.error(error.message, `[line: ${error.token.line}]`);
    hadRuntimeError = true;
}
