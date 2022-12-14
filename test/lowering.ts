import { assert, assertEquals } from 'https://deno.land/std@0.167.0/testing/asserts.ts';
import { Expr, Literal } from '../expr.ts';
import { LoweringVisitor } from '../lower.ts';
import { Block, Expression, Goto, If, Label, While } from '../Stmt.ts';

Deno.test('lower while', () => {
    const program = new While(
        new Literal(1),
        new Block(
            [
                new Expression(
                    new Literal(2),
                ),
            ],
        ),
    );
    assert(program instanceof While);
    assert(program.condition instanceof Literal);
    assert(program.block instanceof Block);

    const l = new LoweringVisitor();
    const lowered = l.lower([program]);
    console.log(Deno.inspect(program))
    console.log(Deno.inspect(lowered,{depth: 10}))

    assert(program instanceof While);
    assert(program.condition instanceof Literal);
    assert(program.block instanceof Block);

    assert(lowered instanceof Block);
    assert(lowered.statements[0] instanceof Label);
    assert(lowered.statements[1] instanceof If);
    assert(lowered.statements[1].thenBranch instanceof Block);
    const goto_stmt = lowered.statements[1].thenBranch.statements.pop();
    assert(goto_stmt instanceof Goto);
    assert(lowered.statements[0].label.lexeme == goto_stmt.label.lexeme);
});
