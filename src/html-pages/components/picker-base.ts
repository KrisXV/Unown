import type { IComponentProps } from "./component-base";
import { ComponentBase } from "./component-base";
import type { IPageElement } from "./pagination";

export interface IPickerProps<PickType> extends IComponentProps {
	currentPick?: string | undefined;
	noPickName?: string | undefined;
	pickerIndex?: number;
	onClear: (pickerIndex: number, dontRender: boolean | undefined) => void;
	onPick: (pickerIndex: number, pick: PickType, dontRender: boolean | undefined) => void;
}

export abstract class PickerBase<PickType = string, PropsType extends IPickerProps<PickType> = IPickerProps<PickType>> extends
	ComponentBase<PropsType> {
	pickCommand: string = 'pick';
	randomPickCommand: string = 'randompick';

	currentPick: string | undefined;
	choices: Dict<PickType> = {};
	choiceElements: Dict<IPageElement> = {};
	noPickName: string;
	noPickElement: IPageElement = {html: ""};
	pickerIndex: number;

	replicationTargets?: PickerBase<PickType, PropsType>[];

	constructor(parentCommandPrefix: string, componentCommand: string, props: PropsType) {
		super(parentCommandPrefix, componentCommand, props);

		this.currentPick = props.currentPick;
		this.pickerIndex = props.pickerIndex || 0;
		this.noPickName = props.noPickName || "None";
		this.noPickElement.html = this.renderNoPickElement();
		this.noPickElement.selected = !this.currentPick;
	}

	abstract getChoiceButtonHtml(choice: PickType): string;

	renderChoices(): void {
		for (const i in this.choices) {
			this.choiceElements[i] = {html: this.renderChoiceElement(i), selected: this.currentPick === i};
		}
	}

	renderChoiceElement(key: string): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + this.pickCommand + ", " + key,
			this.getChoiceButtonHtml(this.choices[key]), this.currentPick === key);
	}

	renderNoPickElement(): string {
		return Client.getPmSelfButton(this.commandPrefix + ", " + this.pickCommand + ", " + this.noPickName, this.noPickName,
			!this.currentPick);
	}

	clear(dontRender?: boolean, replicatedFrom?: PickerBase<PickType, PropsType>): void {
		if (this.currentPick === undefined) return;

		const previousPick = this.currentPick;
		this.currentPick = undefined;

		this.choiceElements[previousPick].html = this.renderChoiceElement(previousPick);
		this.choiceElements[previousPick].selected = false;
		this.noPickElement.html = this.renderNoPickElement();
		this.noPickElement.selected = true;

		if (!replicatedFrom) this.onClear(dontRender);

		this.replicateClear(replicatedFrom);
	}

	onClear(dontRender: boolean | undefined): void {
		this.props.onClear(this.pickerIndex, dontRender);
	}

	parentClear(): void {
		this.clear(true);
	}

	replicateClear(replicatedFrom: PickerBase<PickType, PropsType> | undefined): void {
		if (this.replicationTargets) {
			for (const target of this.replicationTargets) {
				if (!replicatedFrom || target !== replicatedFrom) target.clear(true, this);
			}
		}
	}

	pick(pick: string, dontRender?: boolean, replicatedFrom?: PickerBase<PickType, PropsType>): void {
		if (this.currentPick === pick) return;

		const previousPick = this.currentPick;
		this.currentPick = pick;
		if (previousPick) {
			this.choiceElements[previousPick].html = this.renderChoiceElement(previousPick);
			this.choiceElements[previousPick].selected = false;
		} else {
			this.noPickElement.html = this.renderNoPickElement();
			this.noPickElement.selected = false;
		}

		this.choiceElements[this.currentPick].html = this.renderChoiceElement(this.currentPick);
		this.choiceElements[this.currentPick].selected = true;

		if (!replicatedFrom) this.onPick(pick, dontRender);

		this.replicatePick(pick, replicatedFrom);
	}

	onPick(pick: string, dontRender: boolean | undefined): void {
		this.props.onPick(this.pickerIndex, this.choices[pick], dontRender);
	}

	pickRandom(dontRender?: boolean): void {
		this.pick(Tools.sampleOne(Object.keys(this.choices)), dontRender);
	}

	parentPick(pick: string): void {
		this.pick(pick, true);
	}

	replicatePick(pick: string, replicatedFrom: PickerBase<PickType, PropsType> | undefined): void {
		if (this.replicationTargets) {
			for (const target of this.replicationTargets) {
				if (!replicatedFrom || target !== replicatedFrom) target.pick(pick, true, this);
			}
		}
	}

	tryCommand(originalTargets: readonly string[]): string | undefined {
		const targets = originalTargets.slice();
		const cmd = Tools.toId(targets[0]);
		targets.shift();

		if (cmd === this.pickCommand) {
			const key = targets[0].trim();
			const cleared = key === this.noPickName;
			if (!cleared && (!(key in this.choices) || (this.validateChoice && !this.validateChoice(this.choices[key])))) {
				return "'" + key + "' is not a valid choice.";
			}

			if (cleared) {
				this.clear();
			} else {
				this.pick(key);
			}
		} else if (cmd === this.randomPickCommand) {
			this.pickRandom();
		} else {
			return this.checkComponentCommands(cmd, targets);
		}
	}

	addReplicationTarget(target: PickerBase<PickType, PropsType>): void {
		if (!this.replicationTargets) throw new Error("No replicationTargets defined in " + this.componentId);
		if (!this.replicationTargets.includes(target)) this.replicationTargets.push(target);
	}

	removeReplicationTarget(target: PickerBase<PickType, PropsType>): void {
		if (!this.replicationTargets) throw new Error("No replicationTargets defined in " + this.componentId);
		const index = this.replicationTargets.indexOf(target);
		if (index !== -1) this.replicationTargets.splice(index, 1);
	}

	validateChoice?(choice: PickType): boolean;
}