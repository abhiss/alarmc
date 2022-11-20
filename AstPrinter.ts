import { Binary, Expr, Grouping, Literal, Unary, Visitor } from './expr.ts';
import { Token } from './token.ts';
import { TokenType } from './token_type.ts';

export class AstPrinter implements Visitor<any> {
	print(expr: Expr) {
		return expr.accept(this);
	}
	visitBinaryExpr(expr: Binary) {
		return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
	}
	visitGroupingExpr(expr: Grouping) {
		return this.parenthesize('group', expr.expression);
	}
	visitLiteralExpr(expr: Literal) {
		if (expr.value == null) return 'nil';
		return expr.value;
	}
	visitUnaryExpr(expr: Unary) {
		return this.parenthesize(expr.operator.lexeme, expr.right);
	}

	private parenthesize(name: string, ...exprs: Expr[]): string {
		let builder = '(' + name;
		for (const expr of exprs) {
			builder += ' ';
			builder += expr.accept(this);
		}
		builder += ')';
		return builder;
	}
}

export class RPMAstPrinter implements Visitor<any> {
	print(expr: Expr) {
		return expr.accept(this);
	}
	visitBinaryExpr(expr: Binary) {
		return this.parenthesize(expr.operator.lexeme, expr.left, expr.right);
	}
	visitGroupingExpr(expr: Grouping) {
		return this.parenthesize('', expr.expression);
	}
	visitLiteralExpr(expr: Literal) {
		if (expr.value == null) return 'nil';
		return expr.value;
	}
	visitUnaryExpr(expr: Unary) {
		return this.parenthesize(expr.operator.lexeme, expr.right);
	}

	private parenthesize(name: string, ...exprs: Expr[]): string {
		let builder = '';
		for (const expr of exprs) {
			builder += expr.accept(this);
			builder += ' ';
		}
		builder += name;
		return builder;
	}
}

function example() {
	//main:
	const expression: Expr = new Binary(
		new Grouping(
			new Binary(
				new Literal(1),
				new Token(TokenType.PLUS, '+', null, 1),
				new Literal(2),
			),
		),
		new Token(TokenType.STAR, '*', null, 1),
		new Grouping(
			new Binary(
				new Literal(4),
				new Token(TokenType.MINUS, '-', null, 1),
				new Literal(3),
			),
		),
	);
	// console.log(JSON.stringify(expression));
	const printer = new  RPMAstPrinter();
	console.log(printer.print(expression));
}
