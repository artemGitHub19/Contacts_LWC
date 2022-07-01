import { LightningElement, wire} from 'lwc';

import { ShowToastEvent } from 'lightning/platformShowToastEvent'

import getContacts from '@salesforce/apex/ContactsController.getContacts';
import deleteContact from '@salesforce/apex/ContactsController.deleteContact';

import {refreshApex} from '@salesforce/apex';

import CONTACT_OBJECT from '@salesforce/schema/Contact';
import { NavigationMixin } from 'lightning/navigation';

const actions = [
    { label: 'Edit', name: 'edit' },
    { label: 'Delete', name: 'delete' }
];

const columns = [   
    { 
        label: 'Name',    
        fieldName: 'NameURL',
        type:'url',
        typeAttributes: {
            label: {
                fieldName: 'Name'                
            },
            tooltip: 'Click to open Contact record page',
            target: '_blank'
        },
        sortable: true
    },    
    { 
        label: 'Account Name',    
        fieldName: 'AccountURL',
        type:'url',
        typeAttributes: {
            label: {
                fieldName: 'AccountName'                
            },
            tooltip: 'Click to open Account record page',
            target: '_blank'
        },
        sortable: true
    },
    { 
        label: 'Phone',    
        fieldName: 'Phone',
        type:'phone', 
        sortable: true     
    },
    { 
        label: 'Title',    
        fieldName: 'Title',
        type:'text', 
        sortable: true     
    },
    { 
        label: 'Mailing address',    
        fieldName: 'MailingAddress',
        sortable: true       
    },    
    { 
        type: 'action', 
        typeAttributes: { 
            rowActions: actions, 
            menuAlignment: 'auto' 
        } 
    }    
];

export default class Contacts extends NavigationMixin(LightningElement) {    
    
    isLoading = false;

    objectApiName = CONTACT_OBJECT;

    contacts;
    filteredContacts;
    recordsToDisplay;

    fieldNameToSort;   
    sortedDirection; 

    recordsCount = 0;
    recordsCountPerPage = 10;
    currentPageNumber = 1;
    pagesCount = 0;    

    isNextButtonDisabled = false;
    isPreviousButtonDisabled = true;

    showRecordEditModal = false;
    recordNameToEdit;
    recordIdToEdit;
    recordEditWindowMode;
    recordEditWindowTitle;

    contactFields = [
        'Name',
        'AccountId',
        'Phone',
        'Title',
        'MailingAddress'
    ];

    columns = columns;
    rowNumberOffset = 0;

    searchedContactName = '';

    wiredContactsResult;

    showConfirmationModal = false;
    confirmationOptions = {};

    @wire(getContacts)
    wiredContacts(result) {

        this.isLoading = true;
        this.wiredContactsResult = result;

        let data = result.data;
        let error = result.error;

        this.contacts = [];
       
        if (data) { 
            
            let contact = {};

            for (let i = 0; i < data.length; ++i) {
                contact = {}; 

                for (let property in data[i]) {
                    contact[property] = data[i][property];
                } 

                this.createContactFields(contact, data[i]);
                
                this.contacts.push(contact);                
            }   
            
            this.filterContacts(); 
                    
        } else if (error) {   
            this.showToast({
                title: 'Error!', 
                message: error.body.message, 
                variant: 'error'
            }); 

            this.filteredContacts = [];   
            this.setPagesCount();      
            this.setPaginationButtonsOptions();            
        }
        
        this.isLoading = false;   
    };

    showToast({title, message, variant}) {
        let toastEvent = new ShowToastEvent({
            title: title,
            message: message,
            variant: variant
        });
        this.dispatchEvent(toastEvent);
    }

    createContactFields(contact, data) {
        contact['NameURL'] = '/' + data['Id'];

        if (data['AccountId']) {
            contact['AccountURL'] = '/' + data['AccountId'];
            contact['AccountName'] = data['Account']['Name'];                    
        }            

        if (data['MailingAddress']) {
            contact['MailingAddress'] = Object.values(data['MailingAddress']).join(', ');
        }
    }

    debounce(func, ms) {
        let timeout;
        return function() {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, arguments), ms);
        };
    }

    handleSearchInputChange(event) { 
        this.searchedContactName = event.target.value;

        if ( !this.debouncedFilterContacts ) {
            this.debouncedFilterContacts = this.debounce(this.filterContacts, 700);
        }         

        this.debouncedFilterContacts();
    }

    filterContacts() {

        this.currentPageNumber = 1; 
      
        let searchedContactName = this.searchedContactName;    
        let allContacts = [...this.contacts]; 

        if (searchedContactName) {
            this.filteredContacts = [...allContacts.filter( (contact) =>                 
                contact.Name.toLowerCase().includes(searchedContactName.toLowerCase()))
            ];
        } else {
            this.filteredContacts = [...allContacts];
        }  

        if (this.fieldNameToSort) {  
            this.filteredContacts = [...this.sortContacts()];
        }     

        this.setPagesCount();      
        this.setPaginationButtonsOptions();   
        this.setRecordsToDisplay();       
    }  

    setPaginationButtonsOptions() {        
        this.isNextButtonDisabled = (this.pagesCount === 1) ? true : false;
        this.isPreviousButtonDisabled = true;  
    }

    setPagesCount() {
        this.recordsCount = this.filteredContacts.length;
        this.pagesCount = Math.ceil(this.recordsCount / this.recordsCountPerPage);
        
        if (this.pagesCount === 0) {
            this.pagesCount = 1;
        }
    }
    
    handleNewButtonClick() {        
        this.recordIdToEdit = null;
        this.recordNameToEdit = null;  
        this.recordEditWindowMode = 'create';  
        this.recordEditWindowTitle = 'New Contact';
        this.showRecordEditModal = true; 
    }

    handleRowAction(event) {
        
        let action = event.detail.action;       
        let editedRecord = event.detail.row;
        this.recordIdToEdit = editedRecord.Id;
        
        switch (action.name) {
            case 'edit':                
                this.recordNameToEdit = editedRecord.Name;   
                this.recordEditWindowMode = 'edit';
                this.recordEditWindowTitle = 'Edit ' + this.recordNameToEdit;      
                this.showRecordEditModal = true;                                    
                break;
            case 'delete': 
                this.confirmationOptions = {
                    OperationName: 'Delete',
                    Title: 'Delete Contact',
                    Message: 'Are you sure you want to delete this contact?'                
                };                
                this.showConfirmationModal = true;                
                break;  
        }  
    } 

    closeRecordEditModal(event) {
        if (event.detail) {
            refreshApex(this.wiredContactsResult);   
            
            let titleText;
            let messageText;

            if (this.recordEditWindowMode == 'edit') {
                titleText = 'Success!';
                messageText = 'The record \'' + event.detail.Name + '\' was successfully updated!';                
            } else {
                titleText = "Record created!";
                messageText = "Record ID: " + event.detail.Id;

                this[NavigationMixin.GenerateUrl]({
                    type: 'standard__recordPage',
                    attributes: {
                        recordId: event.detail.Id,
                        objectApiName: CONTACT_OBJECT, 
                        actionName: 'view'
                    }
                }).then(url => {
                    window.open(url, "_blank");
                });
            }
       
            this.showToast({
                title: titleText,
                message: messageText,
                variant: 'success'
            });
        }     
        this.showRecordEditModal = false;
    } 
   
    handleTableSort(event) { 
        this.fieldNameToSort = event.detail.fieldName;
        this.sortedDirection = event.detail.sortDirection;    
        this.filteredContacts = [...this.sortContacts()];       
        this.setRecordsToDisplay();    
    }

    sortContacts() {
        let fieldName = this.fieldNameToSort;

        if (this.fieldNameToSort == 'NameURL') {
            fieldName = 'Name';
        } 

        if (this.fieldNameToSort == 'AccountURL') {
            fieldName = 'AccountName';
        }
       
        let data = this.filteredContacts;      
        let key = function(a) { return a[fieldName]; }
        let reverse = this.sortedDirection == 'asc' ? 1: -1;
       
        data.sort( (a, b) => { 
            a = key(a) ? key(a).toLowerCase() : '';
            b = key(b) ? key(b).toLowerCase() : '';
            return reverse * ((a > b) - (b > a));
        });   
       
        return data;
    }

    handlePreviousButtonClick() {
        --this.currentPageNumber;
        this.setRecordsToDisplay();

        if (this.isNextButtonDisabled && this.currentPageNumber < this.pagesCount) {
            this.isNextButtonDisabled = false;
        }  

        if (this.currentPageNumber == 1) {
            this.isPreviousButtonDisabled = true;
        }
    }

    handleNextButtonClick() {
        ++this.currentPageNumber;
        this.setRecordsToDisplay();  

        if (this.currentPageNumber == this.pagesCount) {
            this.isNextButtonDisabled = true; 
        }  

        if (this.isPreviousButtonDisabled && this.currentPageNumber > 1){            
            this.isPreviousButtonDisabled = false;  
        }
    }     
    
    setRecordsToDisplay() {
        let start = (this.currentPageNumber - 1) * this.recordsCountPerPage;
        let end = start + this.recordsCountPerPage;
        this.recordsToDisplay = [...this.filteredContacts.slice(start, end)];
        this.rowNumberOffset = start;
    }

    closeConfirmationModal(event) {
       
        if (event.detail?.doOperation) {
            if (this.confirmationOptions.OperationName == 'Delete') {                 
                this.deleteContact();
            }
        }  
        this.showConfirmationModal = false;
    }   
    
    deleteContact() {
        this.isLoading = true;
        deleteContact({                      
            contactId: this.recordIdToEdit
        })
        .then( () => {  
            this.showToast({
                title: 'Success!',
                message: 'The record was successfully deleted!',
                variant: 'success'
            });
            refreshApex(this.wiredContactsResult);
        })
        .catch(error => {      
            this.showToast({
                title: 'Error!',
                message: error.body.message,
                variant: 'error'
            });
        })
        .finally( () => {
            this.isLoading = false
        });
    }
}