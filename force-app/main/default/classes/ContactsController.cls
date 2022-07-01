public with sharing class ContactsController {

    @AuraEnabled(cacheable=true)
    public static List<Contact> getContacts(){

        List<Contact> contacts = new List<Contact>();       

        try {
            contacts = [
                SELECT Id, Name, MailingAddress, AccountId, Account.Name, Phone, Title
                FROM Contact              
                WITH SECURITY_ENFORCED
            ];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
        
        return contacts;        
    }

    @AuraEnabled
    public static void deleteContact(String contactId){ 
        
        try {
            List<Contact> contacts = [
                SELECT Id
                FROM Contact
                WHERE Id = :contactId                
                WITH SECURITY_ENFORCED
            ];

            delete contacts.get(0);

        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
}
