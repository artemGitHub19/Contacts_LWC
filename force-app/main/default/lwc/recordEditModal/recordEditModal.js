import { LightningElement, api } from 'lwc';

export default class RecordEditModal extends LightningElement {
    
    @api windowTitle;    
    @api objectApiName;
    @api recordId;
    @api recordName;
    @api windowMode;

    @api objectFields;

    handleSuccess(event) {   

        if (this.windowMode == 'edit') {  
            let fields = event.detail.fields; 
            let lastName = fields.LastName.value;
            let firstName = fields.FirstName.value;

            if (firstName == null) {
                firstName = '';
            }

            let recordName = firstName + ' ' + lastName;        

            this.dispatchEvent(new CustomEvent('closemodal',{
                detail: {Name: recordName}
            }));
        } 
        
        if (this.windowMode == 'create') {
            let newRecordId = event.detail.id;

            this.dispatchEvent(new CustomEvent('closemodal',{
                detail: {Id: newRecordId}
            }));
        }               
    }    

    handleCancelButtonClick() {            
        this.dispatchEvent(new CustomEvent('closemodal'));
    } 

    handleSaveButtonClick() {   
        let submitButton = this.template.querySelector('button[type="submit"]');
        submitButton?.click(); 
    }      
}