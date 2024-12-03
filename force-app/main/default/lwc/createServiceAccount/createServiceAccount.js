import { LightningElement, api, track, wire } from 'lwc';
import { getRecord, getFieldValue} from 'lightning/uiRecordApi';
import { reduceErrors } from 'c/ldsUtils';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import T_C_NotAllowUserAlertMessage from '@salesforce/label/c.T_C_NotAllowUserAlertMessage';
import T_C_Account_User_Config_Alert from '@salesforce/label/c.T_C_Account_User_Config_Alert';
import T_C_Required_Field_Validation from '@salesforce/label/c.T_C_Required_Field_Validation';
import T_C_No_Duplicate_Detected from '@salesforce/label/c.T_C_No_Duplicate_Detected';
import T_C_Address_Type_Validation from '@salesforce/label/c.T_C_Address_Type_Validation';
import T_C_Customer_Account_Success from '@salesforce/label/c.T_C_Customer_Account_Success';
import getCustomerType from '@salesforce/apex/CreateAccountServiceController.getCustomerType';
import getBranchName from '@salesforce/apex/CreateAccountServiceController.getBranchName';
import getProjectAddress from '@salesforce/apex/CreateAccountServiceController.getProjectAddress';
import getAddressDetails from '@salesforce/apex/CreateAccountServiceController.getAddressDetails';
import searchExistingAccounts from '@salesforce/apex/CreateAccountServiceController.searchExistingAccounts';
import AssociateBranchAccount from '@salesforce/apex/CreateAccountServiceController.AssociateBranchAccount';
import createNewAccount from '@salesforce/apex/CreateAccountServiceController.createNewAccount';
import { NavigationMixin } from 'lightning/navigation';
import CreateServiceAccHelper from "./createServiceAccountHelper";

const { userAgent } = navigator;
const DELAY = 300;

const FIELDS = ['Contact.FirstName', 'Contact.LastName', 'Contact.Email'];

export default class CreateServiceAccount extends NavigationMixin(LightningElement) {

    helper = new CreateServiceAccHelper();

    @track label = {
        T_C_NotAllowUserAlertMessage,
        T_C_Account_User_Config_Alert,
        T_C_Required_Field_Validation,
        T_C_No_Duplicate_Detected,
        T_C_Address_Type_Validation,
        T_C_Customer_Account_Success
    }

    @api recordId;
    @track CustomerType;
    
    @track isUserRoleNotAllow = false;
    @track isIOS = false;
    @track CustomerTypeList = [];
    @track isCreateHQAccount = false;

    @track USStates;
    @track CANStates;
    @track COSTARICAStates;
    @track MEXICOStates;
    @track OrganizationName;
    @track FirstName;
    @track LastName;
    @track Email;
    @track Phone;
    @track Address;
    @track Address2;
    @track City;
    @track State;
    @track Zipcode;
    @track county;
    @track country;
    @track Branch;
    @track Usercountry;
    @track timer;
    @track AccountStatusList = [];
    // @track AccountRankList = [];
    @track AccountStatus;
    // @track AccountRank;
    
    @track BillTo = true;
    @track InstallAt = true;
    @track ShipTo = true;
    @track Business = true;
    
    @track BillToPrimary = false;
    @track InstallAtPrimary = false;
    @track ShipToPrimary = false;
    @track BusinessPrimary = false;
    
    @track BillToIdentify = true;
    @track InstallAtIdentify = true;
    @track ShipToIdentify = true;
    @track BusinessIdentify = true;
    
    @track AddressFormat = '';
    @track AdditionalAddressFormat;
    
    @track AdditionalAddressList = [];
    @track autoAdditionlAddressList = [];
    @track showAdditionalAddress = false;
    
    @track AdditionalBillTo = false;
    @track AdditionalInstallAt = false;
    @track AdditionalShipTo = false;
    @track AdditionalBusiness = false;
    
    @track AdditionalBillToPrimary = false;
    @track AdditionalInstallAtPrimary = false;
    @track AdditionalShipToPrimary = false;
    @track AdditionalBusinessPrimary = false;
    
    @track AdditionalBillToIdentify = false;
    @track AdditionalInstallAtIdentify = false;
    @track AdditionalShipToIdentify = false;
    @track AdditionalBusinessIdentify = false;
    
    @track hideAdditionalPopulateSection = false;
    @track noAdditionalAddressFound = false;
    @track AdditionalAddress;
    @track AdditionalAddress2;
    @track AdditionalCity;
    @track AdditionalState;
    @track Additionalcounty;
    @track Additionalcountry;
    @track AdditionalZipcode;
    
    @track existingAccountList = [];
    @track branchList = [];
    @track branchListToDisplay = [];
    @track alreadyExistBranch;
    @track primaryBranchId = '';
    @track selectedAccId;
    @track autoAddressList;
    @track noAddressFound = false;
    @track hidePopulateSection = false;
    
    @track showExistingAccount = false;
    @track showBranchAccount = false;
    @track CreateNewAccount = false;
    @track isServiceFlow = false;
    @track Spinner = false;
    @track stateOptions = [];
    @track isStateRequired = false;
    
    @wire(getRecord, { recordId: '$recordId', fields: FIELDS})
    conRecord({ data, error }) {
        if(error) {
            console.log(error);
        } else if(data) {
            if(this.recordId &&  this.recordId.startsWith('003')){
                this.isServiceFlow = true;
                this.serviceContactId = this.recordId;
                this.Email = getFieldValue(data, 'Contact.Email');
            }
        }
    };

    @wire(getProjectAddress, {queryValue : '$Address', isCanada : '$Usercountry' == 'Canada'})
    projAddress({error, data}){
        debugger;
        if(data){
            let searchResult = [];
            let results = JSON.parse(data).results;
            let length = results.length > 5 ? 5 : results.length; 
            for (let i = 0; i < length; i++){
                searchResult.push({"suggession" : results[i].suggestion, "format" : results[i].format });
            }
            this.autoAddressList = searchResult;

        } else if(error) {
            this.autoAddressList = [];
            let errors = reduceErrors(error).join(', ');
            this.displaytoast('error', errors);
        }
    };

    get isIOSCheck() {
        return userAgent.match(/iPhone|iPad|iPod/i) != null;
    }

    get createBranchButtonClass () { 
        return this.isIOSCheck ? 'slds-button slds-button_brand customIOSButton' : 'slds-button slds-button_brand custombutton';
    }

    get sWrapClass () {
        return this.isIOSCheck ? 'sWrapTest' : '';
    }

    get recordIdNull () {
        return !this.recordId;
    }

    get isCreateBranchAcc() {
        return !this.recordId || this.isServiceFlow
    }

    get isAssociateAcc() {
        return this.recordId && !this.isServiceFlow
    }

    get isBranchListValue(){
        return (this.recordId || (this.branchList != null && this.branchList.length > 0))
    }
    
    get branchListOptions () {
        if(this.branchList != null && this.branchList.length > 0) {
            return this.branchList.map(row => { return { label: row.Name, value: row.Id}});
        } else {
            return;
        }
    }

    get disabledBranch () {
        return (this.branchListToDisplay && this.branchListToDisplay.length == 1);
    }

    get disabledAccountStatus () {
        return (this.AccountStatusList && this.AccountStatusList.length == 1);
    }

    // get disabledAccountRank () {
    //     return (this.AccountRankList && this.AccountRankList.length == 1);
    // }

    get homeOrEmployeeType () {
        return !(this.CustomerType == 'Homeowner' || this.CustomerType == 'Employee');
    }

    get addressValueFound() {
        return (!this.hidePopulateSection && (!this.noAddressFound && this.Address))
    }

    get isCreateNewAcc (){
        return (this.showBranchAccount || this.CreateNewAccount);
    }

    get titleIsCreateNewAcc() {
        return this.showExistingAccount ? 'Create Branch Account' : 'Create New Account';
    }

    get isAlreadyExistBranch () {
        return this.alreadyExistBranch.length > 0;
    }

    connectedCallback() {

        this.Spinner = true; 
        
        getCustomerType()
        .then((result) => {
            
            let customerTypeList = [];
            if(this.recordId && !this.isServiceFlow){
                
                for (let key in result.CustomerType) {
                    if(key != 'Big Box/Homecenter' && key != 'Employee' 
                        && key != 'Homeowner' && key != 'Lumberyard/ProDealer' ){
                        customerTypeList.push({"label": result.CustomerType[key],"value": key});
                    }
                }

            } else {
                
                for (let key in result.CustomerType) {
                    customerTypeList.push({"label": result.CustomerType[key], "value": key});
                };
            }

            let USStates=[];
            for (let key in result.USStates) {
                USStates.push({"label": result.USStates[key], "value": key});
            };
            
            let CANStates=[];
            for (let key in result.CANStates) {
                CANStates.push({"label": result.CANStates[key], "value": key});
            };
            
            let COSTARICAStates=[];
            for (let key in result.COSTARICAStates) {
                COSTARICAStates.push({"label": result.COSTARICAStates[key], "value": key});
            };  
            
            let MEXICOStates=[];
            for (let key in result.MEXICOStates) {
                MEXICOStates.push({"label": result.MEXICOStates[key], "value": key});
            };
            
            let accStatus = [];
            for (let key in result.accStatus) {
                accStatus.push({"label": result.accStatus[key], "value": key});
            };
            
            let accRanks = [];
            for (let key in result.accRank) {
                accRanks.push({"label": result.accRank[key], "value": key});
            };

            this.stateOptions = [
                {
                   id:'1',
                   groupName:'US',
                   childs: USStates
                },
                {
                    id:'2',
                    groupName:'CANADA',
                    childs: CANStates
                 },
                 {
                    id:'3',
                    groupName:'COSTA RICA',
                    childs: COSTARICAStates
                 },
                 {
                    id:'4',
                    groupName:'MEXICO',
                    childs: MEXICOStates
                 }
            ];

            this.CustomerTypeList = customerTypeList;
            this.USStates = USStates;
            this.CANStates = CANStates;
            this.COSTARICAStates = COSTARICAStates;
            this.MEXICOStates = MEXICOStates;
            this.AccountStatusList = accStatus;
            this.AccountStatus = this.disabledAccountStatus ? this.AccountStatusList[0].value : '';
            // this.AccountRankList = accRanks;
            // this.AccountRank = this.disabledAccountRank ? this.disabledAccountRank[0].value : '';

            if(!this.recordId){
                let userProfileName = result?.UserCountry && result?.UserCountry?.Profile ? result.UserCountry.Profile.Name : "";
                if(userProfileName.toLowerCase() == "Pella System Administrator".toLowerCase()){
                    this.isCreateHQAccount = true;
                }
            }
            
            this.isUserRoleNotAllow = result.isUserRoleNotAllow;

            getBranchName({serviceContactId : this.recordId})
            .then((result) => {
                this.Spinner = false;
                this.branchList = result;
                if(result.length == 1){
                    this.Branch = result[0].Id;
                }

                if(result.PrimaryBranch && result.PrimaryBranch != ''){
                    result.BranchList.forEach(element => {
                        if(element.T_C_Branch_Number__c == result.PrimaryBranch){
                            this.primaryBranchId = element.Id;
                            this.Branch = element.Id;
                            this.Usercountry = element.Country__c ? element.Country__c.toLowerCase() : '';
                        }
                    });
                }
            })
            .catch((error) => {
                this.Spinner = false;
                let errors = reduceErrors(error).join(', ');
                this.displaytoast('error', errors);
            });
        })
        .catch((error) => {
            this.Spinner = false;
            let errors = reduceErrors(error).join(', ');
            this.displaytoast('error', errors);
        });
    }

    addressSelection(event) {
        this.hidePopulateSection = true;
        this.Address = event.currentTarget.innerHTML;
        this.AddressFormat = event.currentTarget.dataset.value;
        this.noAddressFound = false;
    }

    cannotfindaddress () {
        this.Address = '';
        this.State = '';
        this.City = '';
        this.Zipcode = '';
        this.Address2 = '';
        this.county = ''; 
        this.isStateRequired = false;
        this.noAddressFound = true;
    }

    handleEmailValue(event) {
        this.Email = this.recordId && this.recordId.startsWith('003') ? this.Email : event.currentTarget.value;
    }

    handleOrganizationName(event) {
        this.OrganizationName = event.currentTarget.value;
    }

    handleFirstName(event) {
        this.FirstName = event.target.value;
    }

    handleLastName(event) {
        this.LastName = event.target.value;
    }

    handleAccountType(event) {
        this.CustomerType = event.detail.value;
        this.Email = this.recordId && this.recordId.startsWith('003') ? this.Email : undefined;
        this.Phone = undefined;
    }

    handleChangeBranch(event) {
        this.Branch = this.Branch ? this.Branch : event.currentTarget.value;
    }

    handleChangeAccStatus(event) {
        this.AccountStatus = event.currentTarget.value;
    }

    handleAddressStreet(event) {
        this.Address = event.currentTarget.value;
    }

    handleAddressStreet2(event) {
        this.Address2 = event.currentTarget.value;
    }

    handleChangeCity(event) {
        this.City = event.currentTarget.value;
    }

    handleChangeZip(event) {
        this.Zipcode = event.currentTarget.value;
    }

    handleChangeCounty(event) {
        this.county = event.currentTarget.value;
    }

    handleAddressKeyChange(event) {
        // Debouncing this method: Do not update the reactive property as long as this function is
        // being called within a delay of DELAY. This is to avoid a very large number of Apex method calls.
        window.clearTimeout(this.delayTimeout);
        const searchKey = event.target.value;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.delayTimeout = setTimeout(() => {
            this.hidePopulateSection = false;
            this.Address = searchKey;
            // let isEnterKey = event.keyCode === 13;
        }, DELAY);
    }

    formattingPhoneNumber(event) {
        if(event.currentTarget.value) {
            this.Phone = this.helper.formatPhoneText(event.currentTarget.value);
        } else {
            this.Phone = undefined;
        }
    }

    backToSingle (){
        this.Address = '';
        this.noAddressFound = false;
        this.isStateRequired = false;
    }

    backToSingleAddition (){
        this.AdditionalAddress = '';
        this.noAdditionalAddressFound = false;
    }

    handleSelectStates(event) {
        console.log('value is '+event.target.value);
        if(event.target.value) {
            this.State = event.target.value;
            let fieldComp = this.template.querySelector('div[data-id="stateField"]');
            if(fieldComp) {
                fieldComp.classList.remove('slds-has-error');
                this.isStateRequired = false;
            }
        }
    }

    handleStateClicks(event) {
        if(!event.target.value) {
            let fieldComp = this.template.querySelector('div[data-id="stateField"]');
            if(fieldComp && !JSON.stringify(fieldComp.classList).includes('slds-has-error')) {
                fieldComp.classList.add('slds-has-error');
                this.isStateRequired = true;
            }
        }
    }

    handleSubmit () {
        
        if(!this.noAddressFound && this.AddressFormat) {

            this.Spinner = true;
            getAddressDetails({addressURL : this.AddressFormat})
            .then((result) => {

                this.Spinner = false;
                let results = JSON.parse(result);
                let address ='';
                let city = '';
                let state = '';
                let zipcode = '';
                let County = '';

                if(results && results.components){

                    let addressComp = results.components;
                    addressComp.forEach(element => {
                        if(element.streetNumber1){
                            address = element.streetNumber1 + address;
                        }else if(element.street1){
                            address += ' '+ element.street1 +',';
                        }else if(element.locality1){
                            city = element.locality1;
                        }else if(element.provinceCode1){
                            state = element.provinceCode1;
                        }else if(element.county1){
                            County = element.county1;
                        }else if(element.postalCode1){
                            zipcode = element.postalCode1;
                        }
                    });
                }
                this.City = city;
                this.State = state;
                this.Zipcode = zipcode;
                this.county = County;
                
                // check validation
                if(this.validateData()){
                    this.existingAccountsHelper();
                }
            }).catch((error) => {
                this.Spinner = false;
                this.displaytoast('warning', 'Invalid Address');
            });
            
        } else {
            
            if(this.validateData()){
                this.existingAccountsHelper();
            }
        }
    }

    handleClose() {
        this.dispatchEvent(this.helper.custEvent('close', undefined));
    }

    handleCancel() {
        this.showExistingAccount = false;
        this.existingAccountList = [];
    }

    handleAddressChecked(event) {
        if(event.currentTarget.dataset.id === 'BillTo') {
            this.BillTo = event.target.checked;
        } else if(event.currentTarget.dataset.id === 'ShipTo') {
            this.ShipTo = event.target.checked;
        } else {
            this.InstallAt = event.target.checked;
        }
    }

    handleCreateAccountScreen () {
        this.CreateNewAccount = true;
        this.branchListToDisplay = this.branchList;

        if(this.primaryBranchId) {
            this.Branch = this.primaryBranchId;
        }else if(this.branchList && this.branchList.length == 1){
            this.Branch = this.branchList[0].Id;
        }
        this.alreadyExistBranch = [];
    }

    handleCancelABP () {
        this.showBranchAccount = false;
        this.CreateNewAccount = false;
        if(this.existingAccountList && this.existingAccountList.length > 0) {
            this.showExistingAccount = true;
        }
    }

    handleCreateAssociation (event) {

        let recId = event.currentTarget.dataset.value;
        debugger;
        this.Spinner = true;
    
        AssociateBranchAccount({ProLowAccId : this.recordId, branchAccId : recId})
        .then((result) => {
            
            this.Spinner = false;
            this.displaytoast('success', 'Account Associated Sucessfully');
            
            let data = {
                recId : recId,
                close : true
            }
            this.dispatchEvent(this.helper.custEvent('redirect', data));
        })
        .catch((error) => {
            this.Spinner = false;
            let errors = reduceErrors(error).join(', ');
            this.displaytoast('error', errors);
        });
    }

    handleRecordLink(event) {

        let data = {
            recId : event.currentTarget.dataset.id,
            close : false
        }
        this.dispatchEvent(this.helper.custEvent('redirect', data));
    }

    handleCreateABP(event) {

        let recId = event.currentTarget.dataset.value;
        this.selectedAccId = recId;
        this.showBranchAccount = true;
        let selectedAccRec;
        let existingAccounts = this.existingAccountList;

        for(let i in existingAccounts){
            if(existingAccounts[i].RecordId == recId){
                selectedAccRec = existingAccounts[i];
                break;
            }
        }

        let branchAlreadyExist = selectedAccRec.existingBranch;
        
        let branchListToDisplay =[];
        let alreadyExistBranch =[];
        let branchList = this.branchList;
        let branchIds = [];

        branchList.forEach(row => {
            if(!(branchAlreadyExist.includes(row.Id))){
                branchListToDisplay.push(row.Id);
                branchIds.push(row.Id);
            } else{
                alreadyExistBranch.push(row);
            }
        });

        if(branchListToDisplay.length == 1){
            this.Branch = branchListToDisplay[0].Id;
        }else if(this.primaryBranchId != "" && branchIds.includes(this.primaryBranchId)){
            this.Branch = this.primaryBranchId;
        }
        this.branchListToDisplay = branchListToDisplay;
        this.alreadyExistBranch = alreadyExistBranch;
    }

    handleCreateAccount () {
        // check validation
        if(this.validateBranchData()){
            this.createNewAccountHelper();
        }
    }

    createNewAccountHelper () {
        debugger;
        this.Spinner = true;
        let address = this.Address;

        if(!this.noAddressFound){
            let lastIndexAddress = address.lastIndexOf(",");
            if(lastIndexAddress != -1){
                address = address.substring(0, lastIndexAddress);
            }
        }
        
        var RTAForm = {
            "CustomerType" : this.CustomerType,
            "PhoneType" : this.PhoneType,
            "OrganizationName" : this.OrganizationName,
            "FirstName" : this.FirstName,
            "LastName" : this.LastName,
            "Email" : this.Email,
            "Phone" : this.Phone,
            "Address" : address,
            "Address2" : this.Address2,
            "City" : this.City,
            "State" : this.State,
            "Zipcode" : this.Zipcode,
            "county" : this.county,
            "branchId":this.Branch,
            "AccStatus":this.AccountStatus,
            // "AccRank":this.AccountRank,
            "BillTo" : this.BillTo,
            "InstallAt" : this.InstallAt,
            "ShipTo" : this.ShipTo,
            "Business" : this.Business,
            
            "BillToPrimary" : this.BillTo,
            "InstallAtPrimary" : this.InstallAt,
            "ShipToPrimary" : this.ShipTo,
            "BusinessPrimary" : this.Business,
            
            "BillToIdentify" : this.BillToIdentify,
            "InstallAtIdentify" : this.InstallAtIdentify,
            "ShipToIdentify" : this.ShipToIdentify,
            "BusinessIdentify" : this.BusinessIdentify,
            "Usercountry" : this.Usercountry,
            "currentRecId" : this.recordId,
            "serviceContactId" : this.recordId
            
        };

        if(this.showBranchAccount && this.selectedAccId != null){
            RTAForm.RecordId = this.selectedAccId;
        }
        
        // Update primary and identify address
        let addr = this.AdditionalAddressList;
        
        addr.forEach(add => {
            add.BillToPrimary = false;
            add.InstallAtPrimary = false;
            add.ShipToPrimary = false;
            add.BusinessPrimary = false;
            add.BillToIdentify = false;
            add.InstallAtIdentify = false;
            add.ShipToIdentify = false;
            add.BusinessIdentify = false;
            
            if(add.BillTo && !this.BillTo) add.BillToPrimary = true;
            if(add.InstallAt && !this.InstallAt) add.InstallAtPrimary = true;
            if(add.ShipTo && !this.ShipTo) add.ShipToPrimary = true;
            if(add.Business && !this.Business) add.BusinessPrimary = true;
        });
        
        this.AdditionalAddressList = addr;
        
        createNewAccount({requestData : JSON.stringify(RTAForm), AdditionalAddress : JSON.stringify(this.AdditionalAddressList)})
        .then((result) => {
            this.Spinner = false;
            if(this.showBranchAccount && this.selectedAccId != null){
                this.displaytoast('success', this.label.T_C_Customer_Account_Success);
            }else{
                this.displaytoast('success', this.label.T_C_Customer_Account_Success);
            }
            
            let data = {
                recId : result,
                close : true
            }
            this.dispatchEvent(this.helper.custEvent('redirect', data));
        })
        .catch((error) => {
            this.Spinner = false;
            let errors = reduceErrors(error).join(', ');
            this.displaytoast('error', errors);
        });
    }

    validateBranchData() {
        
        //Validate All Fields
        
        let isValidBranch = !this.helper.validateSelectfield(this, 'Branch');
        if(this.recordIdNull && isValidBranch) {
            this.displaytoast('warning', this.label.T_C_Required_Field_Validation);
            return false;
        }

        if(!this.BillTo && !this.InstallAt && !this.ShipTo && !this.Business) {
            this.displaytoast('warning', this.label.T_C_Address_Type_Validation);
            
            const elements = this.template.querySelectorAll('.addType');
            elements.forEach(element => {
                element.addEventListener("animationend", function(){
                    this.classList.remove("blink");
                });
                element.classList.add("blink");
            });
            return false;
        }        
        return true; 
    }

    validateData () {
        
        //Validate All Fields
        let isValidCT = this.helper.validateSelectfield(this, 'CustomerType');
        let isValidAddress = true;
        let isValidCity = true;
        let isValidState = true;
        let isValidZipcode = true;

        if(this.noAddressFound){
            isValidAddress = this.helper.validateInputfield(this, 'AddressCust');
            isValidCity = this.helper.validateInputfield(this, 'City');
            isValidState = !this.helper.isEmpty(this.State); //helper.validateInputfield(component,'State');
            if(!isValidState) {
                this.handleStateClicks({target: {value: ''}});
            }
            isValidZipcode = this.helper.validateInputfield(this, 'Zipcode');
            
        }else{
            isValidAddress = this.helper.validateInputfield(this, 'Address');
        }
        
        if(!isValidCT || !isValidAddress || !isValidCity || !isValidState || !isValidZipcode){
            this.displaytoast('warning', this.label.T_C_Required_Field_Validation);
            return false;
        }

        if(this.CustomerType == "Homeowner" || this.CustomerType == "Employee"){
            let isValidFN = this.helper.validateInputfield(this, 'FirstName');
            let isValidLN = this.helper.validateInputfield(this, 'LastName');
            let isValidEmail = this.helper.isEmpty(this.Email);
            let isValidPhone = this.helper.isEmpty(this.Phone);

            if(!isValidFN || !isValidLN) {
                this.displaytoast('warning', this.label.T_C_Required_Field_Validation);
                return false;
            }

            if(isValidEmail && isValidPhone) {
                this.displaytoast('warning', 'Please Fill Email or Phone information.');
                return false;
            }

        } else {
            let isValidON = this.helper.validateInputfield(this, 'OrganizationName');
            let isValidPhone = this.helper.isEmpty(this.Phone);
            let isValidEmail = this.helper.isEmpty(this.Email);

            if(!isValidON) {
                this.displaytoast('warning', this.label.T_C_Required_Field_Validation);
                return false;
            }

            if(isValidEmail && isValidPhone) {
                this.displaytoast('warning', 'Please Fill Email or Phone information.');
                return false;
            }
        }
        
        return true; 
    }

    existingAccountsHelper () {
        
        this.Spinner = true;
        let address = this.Address;

        if(!this.noAddressFound){
            let lastIndexAddress = address.lastIndexOf(",");
            if(lastIndexAddress != -1){
                address = address.substring(0, lastIndexAddress);
            }
        }

        let RTAForm = {
            "CustomerType" : this.CustomerType,
            "OrganizationName" : this.OrganizationName,
            "FirstName" : this.FirstName,
            "LastName" : this.LastName,
            "Email" : this.Email,
            "Phone" : this.Phone,            
            "Address" : address,
            "Address2" : this.Address2,
            "City" : this.City,
            "State" : this.State,
            "Zipcode" : this.Zipcode,
            "Usercountry" : this.Usercountry,
            "currentRecId" : this.recordId
        };

        searchExistingAccounts({requestData : JSON.stringify(RTAForm)})
        .then((result) => {

            this.Spinner = false;
            if(result.length > 0) {

                this.isAccInfo = false;
                this.existingAccountList  = result;
                this.showExistingAccount = true;

                // window.clearTimeout(this.delayTimeout);
                // this.delayTimeout = setTimeout(() => {
                //     let j$ = jQuery.noConflict();
                //     if (j$.fn.DataTable.isDataTable('#SearchAccount') ) {
                //         j$('#SearchAccount').DataTable().destroy();
                //     }
                //     j$('#SearchAccount').DataTable( {
                //         "order": [[ 5, "asc" ]]
                //     });
                // }, DELAY);
                           
            } else {

                this.displaytoast('success', this.label.T_C_No_Duplicate_Detected);
                this.CreateNewAccount = true;
                this.isAccInfo = false;
                this.branchListToDisplay = this.branchList;
                if(this.primaryBranchId) {
                    this.Branch = this.primaryBranchId;
                }else if(this.branchList && this.branchList.length == 1) {
                    this.Branch = this.branchList[0].Id;
                }
                this.alreadyExistBranch = [];
            }

        })
        .catch((error) => {
            this.Spinner = false;
            let errors = reduceErrors(error).join(', ');
            this.displaytoast('error', errors);
        });
    }
    
    displaytoast = (type, message) => {
        this.dispatchEvent(new ShowToastEvent({variant : type, title : type.toUpperCase(), message : message})); 
    }
}