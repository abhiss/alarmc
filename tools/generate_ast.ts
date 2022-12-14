//this script generates ast classes in expr.ts and stmt.ts
if (Deno.args.length != 1) {
    console.error('Usage: deno run --allow-write ./generate_ast.ts <output_directory>');
    Deno.exit(64);
}
const output_dir: string = Deno.args[0];
defineAst(output_dir, 'Expr', [
    'Assign   : Token name, Expr value',
    'Binary   : Expr left, Token operator, Expr right',
    'Grouping : Expr expression',
    'Literal  : unknown value',
    'Unary    : Token operator, Expr right',
    'Variable : Token name',
]);

defineAst(output_dir, 'Stmt', [	
	'Block		: Array<Stmt> statements',
    'Expression : Expr expression',
    'Goto      	: Token label',
	'Label		: Token label',
    'If 		: Expr condition, Stmt thenBranch, Stmt|null elseBranch',
    'Var		: Token name, Expr initializer',
    'While      : Expr condition, Stmt block'
]);

function defineAst(output_dir: string, base_name: string, types: string[]) {
    const path = output_dir + '/' + base_name + '.ts';
    const writer = new Array<string>();

    writer.push('// deno-lint-ignore-file no-explicit-any');
    writer.push('//this file is generated by generate_ast.ts');
    writer.push('import { Token } from "./token.ts";');
    if (base_name == 'Stmt') writer.push('import { Expr } from "./expr.ts"');
    writer.push('');
    writer.push('export abstract class ' + base_name + ' {');
    writer.push('    abstract accept(visitor: Visitor<any>):any;');
    writer.push('}');
    writer.push('');
    defineVisitor(writer, base_name, types);
    writer.push('');

    for (const type of types) {
        const class_name = type.split(':')[0].trim();
        const fields = type.split(':')[1].trim();
        defineType(writer, base_name, class_name, fields);
    }
    writer.push('');

    writer.push('');
    Deno.writeTextFileSync(path, writer.join('\n'));
}

function defineVisitor(writer: string[], base_name: string, types: string[]) {
    writer.push('export interface Visitor<R> {');

    for (const type of types) {
        console.log(type);
        const typename = type.split(':')[0].trim();
        writer.push(`    visit${typename}${base_name}(${base_name.toLowerCase()}:${typename}): R;`);
    }
    writer.push('}');
}

function defineType(writer: string[], base_name: string, class_name: string, fieldList: string) {
    writer.push(`export class ${class_name} extends ${base_name} {`);

    //fields
    const fields = fields_java_to_ts(fieldList.split(', '));
    for (const field of fields) {
        writer.push('    readonly ' + field + ';');
    }

    //constructor
    writer.push('    constructor(' + fields.join(', ') + ') {');
    writer.push('        super();');
    for (const field of fields) {
        const name = field.split(':')[0];
        writer.push(`        this.${name} = ${name};`);
    }
    writer.push('    }');

    //visitor
    writer.push('');
    writer.push('    accept(visitor:Visitor<any>): any {');
    writer.push(`        return visitor.visit${class_name}${base_name}(this);`);
    writer.push('    }');
    writer.push('');
    writer.push('}');
}

// implementation specific
function fields_java_to_ts(fields: string[]) {
    const result = [];
    for (const elm of fields) {
        const type_id = elm.split(' ');
        result.push(type_id[1] + ':' + type_id[0]);
    }
    return result;
}
