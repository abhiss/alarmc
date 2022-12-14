//environment is what stores teh values of variable used in lox
import { LoxRuntimeError } from './main.ts';
import { RuntimeError } from './runtime_error.ts';
import { Token } from './token.ts';
const reset_r0 = 'mov r0 1\n';

export class CodegenEnvironment {
    readonly variable_to_addres = new Map<string, number>();
    readonly BASE_ADDR = 0x90;
    private current_addr = this.BASE_ADDR;

    //declare variable with register that contains initial value
    gen_define_variable(name: string, reg: string) {
        if (reg == 'r0') throw new Error('reg r0 used internally.');

        if (this.variable_to_addres.has(name)) {
            throw Error(`Trying to define variable: ${name} that is already defined.`);
        }

        const address = this.current_addr++;
        console.log(`assigning address: ${address} for variable: ${name}`);
        this.variable_to_addres.set(name, address);

        return `
			; set variable ${name} to value in ${reg} at address ${address}
			mov r0 ${address} ; address
			str ${reg} [r0] 
			${reset_r0}
		`;
    }

    gen_assign_variable_to_reg(name: string, reg: string): string {
        if (reg == 'r0') throw new Error('reg r0 used internally.');
        if (!this.variable_to_addres.has(name)) {
            console.log(this.variable_to_addres)
            throw new Error(`Address for variable ${name} not created`);
        }
        const address = this.variable_to_addres.get(name);
        return `
			; assign variable ${name} to value in ${reg} at address ${address}
			mov r0 ${address} ; address
			str ${reg} [r0] 
			${reset_r0}
		`;
    }

    // //returns address of variable (in RAM)
    // get(name: Token): unknown {
    // 	if (this.variable_to_addres.has(name.lexeme)) {
    // 		return this.variable_to_addres.get(name.lexeme);
    // 	}
    // 	throw new RuntimeError(name, `Undefined variable: '${name.lexeme}'.`);
    // }
    gen_read_var_into_reg(name: string, reg: string): string {
        if (reg.toLowerCase() == 'r0') {
            throw new Error('r0 not supported because it will be reset.');
        }
        const address = this.variable_to_addres.get(name);
        if (!address) throw new Error(`Variable ${name} is not defined.`);
        return `; reading variable ${name} to register ${reg}
			mov r0 ${address} ; address of variable
			ldr ${reg} [r0]
			${reset_r0}
		`;
    }
}

export class LabelEnv {
    // private labels = new Array<string>();
    private counter = 0;

    /**
     * @param name name that describes the label, inserted into genered asm.
     * @returns unique label name that can be used directly in assembly.
     */
    public new_gen_label(name: string): string {
        const label = `__gen_label_${name}_${+this.counter++}`;
        return label;
    }
}
