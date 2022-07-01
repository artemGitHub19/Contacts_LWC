import { LightningElement, api } from 'lwc';

export default class ConfirmationModal extends LightningElement {

    @api windowTitle;
    @api windowMessage;
    @api operationName;

    handleCancelButtonClick() {
        this.dispatchEvent(new CustomEvent('closemodal',{
            detail: { doOperation: false }
        }));
    }

    handlePositiveResponse() {
        this.dispatchEvent(new CustomEvent('closemodal',{
            detail: { doOperation: true }
        }));
    }
}