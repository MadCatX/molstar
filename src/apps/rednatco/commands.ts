export namespace Commands {
    export type Type = 'redraw'|'select-step'|'switch-model';

    export type Redraw = { type: 'redraw' }
    export function Redraw(): Redraw { return { type: 'redraw' }; }

    export type SelectStep = {
        type: 'select-step';
        stepName: string;
        prevStepName: string|null;
        nextStepName: string|null;
        referenceNtC: string;
        references: ('sel'|'prev'|'next')[];
    }
    export function SelectStep(stepName: string, prevStepName: string|null, nextStepName: string|null, referenceNtC = '', references = ['sel', 'prev', 'next']): SelectStep {
        return {
            type: 'select-step',
            stepName,
            prevStepName,
            nextStepName,
            referenceNtC,
            references: references as ('sel'|'prev'|'next')[],
        };
    }

    export type SwitchModel = { type: 'switch-model', model: number };
    export function SwitchModel(model: number): SwitchModel { return { type: 'switch-model', model }; }

    export type Cmd = Redraw|SelectStep|SwitchModel;
}
