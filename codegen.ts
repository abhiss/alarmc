/*
Register usage:
r7 is PC+1 (next instruction). cannot be changed.
r6 is stack pointer. Only changed for push/pop stack operations.
r5-r3 are free so far.
r2-r1 are used to move data from stack/RAM into register to operate on them.
r0 should always = 1. A generator can use it temporarily but must restore it to 1. Used to inc/decrement r6 (stack pointer)

Logical and - false if r1 * r2 == 0, because one of them must've been zero
logical or - false if r1 + r2 == 0, because none of them are > 0.
*/

import {
    Assign,
    Binary,
    Expr,
    Grouping,
    Literal,
    Unary,
    Variable,
    Visitor as ExprVisitor,
} from './expr.ts';
import {
    Block,
    Expression,
    Goto,
    If,
    Label,
    Print,
    Stmt,
    Var,
    Visitor as StmtVisitor,
    While,
} from './Stmt.ts';
import { Token } from './token.ts';
import { TokenType as TT } from './token_type.ts';
import { CodegenEnvironment, LabelEnv } from './codegen_variables.ts';
import { RuntimeError } from './runtime_error.ts';

const reset_r0 = 'mov r0 1\n';
const R = {
    0: 'r0',
    1: 'r1',
    2: 'r2',
    3: 'r3',
    4: 'r4',
    5: 'r5',
    6: 'r6',
    7: 'r7',
};

export class CodeGen implements ExprVisitor<unknown>, StmtVisitor<string> {
    variables = new CodegenEnvironment();
    labels = new LabelEnv();
    user_provided_labels: string[] = [];

    private evaluate(expr: Expr): string {
        return expr.accept(this);
    }
    private generate(stmt: Stmt): string {
        return stmt.accept(this);
    }
    visitWhileStmt(stmt: While): string {
        throw new Error(
            'Encountered While statment in codegen. While statements should be lowered before codegen.',
        );
    }
    visitBlockStmt(stmt: Block): string {
        //generate all statements in list
        return stmt.statements.reduce((acc: string, curr: Stmt): string => {
            return acc + curr.accept(this);
        }, '; block statement: \n');
    }

    visitExpressionStmt(stmt: Expression): string {
        return this.evaluate(stmt.expression);
    }

    visitLabelStmt(stmt: Label): string {
        if (this.user_provided_labels.includes(stmt.label.lexeme)) {
            throw new Error(`Label ${stmt.label.lexeme} already defined.`);
        }
        return `
            ${stmt.label.lexeme}: ; set user provided label
        `;
    }

    visitGotoStmt(stmt: Goto): string {
        return `
            b ${stmt.label.lexeme} ; branch to user provided label
        `;
    }
    //variable definition
    visitVarStmt(stmt: Var): string {
        //assume evaluate generates code that puts data "value" on stack.
        let asm = '';
        asm += this.evaluate(stmt.initializer);
        asm += this.pop(R[1]);
        asm += this.variables.gen_define_variable(stmt.name.lexeme, R[1]);
        asm += reset_r0;
        return asm;
    }

    visitAssignExpr(expr: Assign): unknown {
        return `
        ${this.evaluate(expr.value)}
        ${this.pop(R[1])} ; popped assignment value into r1
        ; assigning r1 to variable ${expr.name.lexeme}
        ${this.variables.gen_assign_variable_to_reg(expr.name.lexeme, R[1])} 

        `;
    }

    visitPrintStmt(stmt: Print): string {
        return `;print statement
            ${this.evaluate(stmt.value)}
            ${this.pop(R[1])}
            mov r2 -1
            str r1 [r2]
        `;
    }
    visitIfStmt(stmt: If): string {
        //if top of stack if 0, go to else stmt, otherwise go to then stmt
        const else_ = this.labels.new_gen_label('else');
        const finally_ = this.labels.new_gen_label('finally');

        const then_stmt = this.generate(stmt.thenBranch);
        const else_stmt = (stmt.elseBranch) ? this.generate(stmt.elseBranch) : '';
        return `
            ${this.evaluate(stmt.condition)}
            ${this.pop(R[1])} ; popped result of condition into r1
            
            ; branch based on r1
            mul r1 r1 r0

            beq ${else_}
            ; then statement
            ${then_stmt}
            b ${finally_}

            ${else_}: ;
            ; eles statement
            ${else_stmt}

            ${finally_}:
        `;
    }

    visitVariableExpr(expr: Variable): string {
        //push data from value onto stack
        let asm = `;pushing variable ${expr.name.lexeme} to stack`;
        asm += this.variables.gen_read_var_into_reg(expr.name.lexeme, R[1]);
        asm += this.push_reg(R[1]);
        asm += reset_r0;
        return asm;
    }
    visitBinaryExpr(expr: Binary) {
        return this.parenthesize(expr.operator, expr.left, expr.right);
    }
    visitGroupingExpr(expr: Grouping) {
        return this.parenthesize(undefined, expr.expression);
    }
    visitLiteralExpr(expr: Literal) {
        if (expr.value == null) return 'nil';
        // console.error('found literal: ' + expr.value);
        if (isNaN(parseInt(expr.value as string))) throw Error('value not a number');
        return this.push_value(parseInt(expr.value as string));
    }
    visitUnaryExpr(expr: Unary) {
        return this.parenthesize(expr.operator, expr.right);
    }
    private get_instr(operator: TT) {
        switch (operator) {
            case TT.PLUS:
                return 'add';
            case TT.STAR:
                return 'mul';
            case TT.MINUS:
                return 'sub';
            case TT.SLASH:
                return 'div';
            case TT.EQUAL_EQUAL:
            case TT.BANG:
            case TT.OR:
            case TT.AND:
            case TT.LESS:
                //these are treated specially in calling function
                return null;
            default:
                throw Error('Invalid operator. Only + * - / are supported.');
        }
    }

    private parenthesize(operator: Token | undefined, ...exprs: Expr[]): string {
        let builder = '';
        for (const expr of exprs) {
            builder += expr.accept(this);
            builder += '\n';
        }
        if (operator == undefined) {
            return builder;
        }
        const instr = this.get_instr(operator.type);
        if (instr !== null) {
            const asm = [];
            asm.push(this.pop(R[2]));
            asm.push(this.pop(R[1]));
            asm.push('; operation ' + instr + ' on r1 and r2');
            asm.push(`${instr} r1 r1 r2`);
            asm.push('str r1 [r6]');
            asm.push('add r6 r6 r0');
            builder += asm.join('\n');
        } else if (operator.type == TT.EQUAL_EQUAL) { //comparison operators
            const not_equal_label = this.labels.new_gen_label('not_equal');
            builder += `
                ; comparison: r[1] == r[2]. Push 0 if not equal
                ${this.pop(R[2])}
                ${this.pop(R[1])}
                cmp r1 r2 ; equality operation
                mov r3 0
                bne ${not_equal_label}
                mov r3 1 ; this only runs if comparison was equal
                ${not_equal_label}:
                ${this.push_reg(R[3])}
            `;
        } else if (operator.type == TT.BANG) {
            const not_equal_label = this.labels.new_gen_label('not_equal');
            builder += `
                ; negation: !r[1]
                ${this.pop(R[1])}
                cmp r1 r2 ; equality operation
                mov r3 0
                bne ${not_equal_label}
                mov r3 1 ; this only runs if comparison was equal
                ${not_equal_label}:
                ${this.push_reg(R[3])}
            `;
        } else if (operator.type == TT.AND) {
            //not implemented in parser
            const not_and = this.labels.new_gen_label('not_and');

            builder += `; logical AND
                ${this.pop(R[2])}
                ${this.pop(R[1])}
                mul r1 r1 r2 ; 1 if left and right of and are non-zero
                mov r3 0
                beq ${not_and}
                mov r3 1
                ${not_and}:
                ${this.push_reg(R[3])}
            `;
        } else if (operator.type == TT.LESS) {
            //not implemented in parser
            const not_lessthan = this.labels.new_gen_label('not_lessthan');

            builder += `; < operator
                ${this.pop(R[2])}
                ${this.pop(R[1])}
                cmp r1 r2
                mov r1 flags
                mov r2 2 ; make carry flag mask
                and r1 r1 r2 ; move carry flag to r1
                mov r3 0
                beq ${not_lessthan}
                mov r3 1
                ${not_lessthan}:
                ${this.push_reg(R[3])}
             `;
        } else {
            throw new Error('operator not implemented.');
        }
        // builder += operator.lexeme;
        return builder;
    }

    private push_reg(reg: string): string {
        let asm = `
            ; pushing value of reg ${reg} to stack
            str ${reg} [r6]
            add r6 r6 r0 ; increment stack pointer
            `;
        return asm;
    }
    private push_value(num: number): string {
        let asm = `
            ; pushing ${num} to stack
            mov r3 ${num}
            str r3 [r6]
            add r6 r6 r0 ; increment stack pointer
            `;
        return asm;
    }
    private pop(reg: string): string {
        let asm = [];
        asm.push(`; popping value off stack into ${reg}`);
        asm.push('sub r6 r6 r0'); //decrement stack pointer
        asm.push(`ldr ${reg} [r6]`);
        asm.push(`mov r3 0`);
        asm.push(`str r3 [r6]`);
        return asm.join('\n') + '\n';
    }
}
function example() {
    //main:
    const expression: Expr = new Binary(
        new Binary(
            new Literal(2),
            new Token(TT.PLUS, '+', null, 1),
            new Literal(2),
        ),
        new Token(TT.STAR, '*', null, 1),
        new Binary(
            new Literal(4),
            new Token(TT.PLUS, '+', null, 1),
            new Literal(4),
        ),
    );
    const gen = new CodeGen();
    // console.log(gen.evaluate(expression));
}

// example();
