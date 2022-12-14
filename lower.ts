import { TokenType, TokenType as TT } from './token_type.ts';
import { Token } from './token.ts';
import { Block, Expression, Goto, If, Label, Print, Stmt, Var, Visitor, While } from './Stmt.ts';
import { LabelEnv } from './codegen_variables.ts';

export class LoweringVisitor implements Visitor<Stmt> {
    label_env = new LabelEnv();

    public lower(stmts: Stmt[]): Stmt[] {
        return stmts.map((e) => e.accept(this));
    }
    visitPrintStmt(stmt: Print): Stmt {
        return stmt;
    }
    visitIfStmt(stmt: If) {
        stmt.thenBranch.accept(this);
        if (stmt.elseBranch) {
            stmt.elseBranch.accept(this);
        }
        return new If(stmt.condition, stmt.thenBranch.accept(this), stmt.elseBranch?.accept(this));
    }
    visitBlockStmt(stmt: Block) {
        const new_statments = [];
        for (let s of stmt.statements) {
            new_statments.push(s.accept(this));
        }
        return new Block(new_statments);
    }

    visitExpressionStmt(stmt: Expression) {
        return stmt;
    }
    visitGotoStmt(stmt: Goto) {
        return stmt;
    }
    visitLabelStmt(stmt: Label) {
        return stmt;
    }
    visitVarStmt(stmt: Var) {
        return stmt;
    }
    visitWhileStmt(stmt: While) {
        const label = this.label_env.new_gen_label('while_loop_lowered');
        const label_t = new Token(TT.LABEL, label, null, NaN);
        return new Block(
            [
                new Label(label_t),
                new If(
                    stmt.condition,
                    new Block([
                        stmt.block,
                        new Goto(label_t),
                    ]),
                    null,
                ),
            ],
        );
    }
}
