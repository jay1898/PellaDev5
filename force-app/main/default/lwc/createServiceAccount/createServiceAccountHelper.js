export default class CreateServiceAccHelper {

    isEmpty (data){
        if(data==undefined || data==null || data==""){
            return true;
        }
        try{
            if(data.trim()==""){
                return true;
            }
        }catch(e){
            
        }
        return false;
    }

    validateInputfield (self, inputFieldId) {
        // check email is valid
        let inputCmp = self.template.querySelector('lightning-input[data-id="'+inputFieldId+'"]');
        inputCmp.reportValidity();
        if(!inputCmp.checkValidity()){
            return false;
        }
        return true;
    }

    validateSelectfield (self, inputFieldId) {
        // check email is valid
        let inputCmp = self.template.querySelector('lightning-combobox[data-id="'+inputFieldId+'"]');
        inputCmp.reportValidity();
        if(!inputCmp.checkValidity()){
            return false;
        }
        return true;
    }

    formatPhoneText(phValue) {

        let value = phValue;
        value = (value.trim()).replace(new RegExp('-', 'g'), "");

        if(value.length > 10){
            value = value.slice(0,10);            
        }
        if(value.length > 3 && value.length <= 6) {
            value = value.slice(0,3) + "-" + value.slice(3);
        } else if(value.length > 6) {
            value = value.slice(0,3) + "-" + value.slice(3,6) + "-" + value.slice(6);
        }
        return value;
    }

    parseISOString (isoString) {
        let b = isoString.split(/\D+/);
        return new Date(Date.UTC(b[0], --b[1], b[2], b[3], b[4], b[5], b[6]));
    }

    custEvent(eventName, data) {
        //let buttonId = event.currentTarget.dataset.button;
        const selectedEvent = new CustomEvent(eventName, {
            detail: {
                value : data
            }
        });
        return selectedEvent;
    }
}