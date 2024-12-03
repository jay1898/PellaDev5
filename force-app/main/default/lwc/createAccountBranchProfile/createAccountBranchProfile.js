import { LightningElement, track, wire, api } from 'lwc';
import searchBranches from '@salesforce/apex/BranchProfileController.searchBranches';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord } from 'lightning/uiRecordApi';
import createBranchProfile from '@salesforce/apex/BranchProfileController.createBranchProfile';
import performGraphQLCheck from '@salesforce/apex/BranchProfileController.performGraphQLCheck';
import getBranchFamilyNumber from '@salesforce/apex/BranchProfileController.getBranchFamilyNumber';
import checkExistingBranch from '@salesforce/apex/BranchProfileController.checkExistingBranch';
import { CloseActionScreenEvent } from 'lightning/actions';
import { NavigationMixin } from 'lightning/navigation';
import ACCOUNT_PARTY_FIELD from "@salesforce/schema/Account.mdmrecid__c";
import ACCOUNT_NAME_FIELD from "@salesforce/schema/Account.Name";


const ACCOUNT_FIELDS = ['Account.Name', 'Account.mdmrecid__c'];

export default class BranchSearch extends NavigationMixin(LightningElement) {
  @track isLoading = false;
  @track searchKey = '';
  @track branches = [];
  @track selectedBranchId;
  @track branchFamilyNumber = '';
  @track mdmrecid = '';
  @api recordId; // Account Id
  @track createEbs;

  @wire(getRecord, { recordId: '$recordId', fields: [ACCOUNT_PARTY_FIELD, ACCOUNT_NAME_FIELD] })
  account;

  handleSearchKeyChange(event) {
    this.searchKey = event.target.value;
    if (this.searchKey.length > 0) {
      this.searchBranches();
    } else {
      this.branches = [];
    }
  }

  navigateToBranchProfile(recordId) {
    if (recordId.startsWith('001')) {
      this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
          recordId: recordId,
          objectApiName: 'Account',
          actionName: 'view'
        },
        state: {
          navigationLocation: 'primary'
        }
      });
    } else {
      this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: {
          recordId: recordId,
          objectApiName: 'Account_Branch_Profile__c',
          actionName: 'view'
        },
        state: {
          navigationLocation: 'primary'
        }
      });
    }
  }

  searchBranches() {
    this.isLoading = true;
    searchBranches({ searchKey: this.searchKey })
      .then((result) => {
        this.isLoading = false;
        this.branches = result;
      })
      .catch((error) => {
        this.showToast('Error', error.body ? error.body.message : error.message, 'error');
        this.isLoading = false;
      });
  }

  handleBranchSelect(event) {
    console.log('the account name is '+this.account.data.fields[ACCOUNT_NAME_FIELD.fieldApiName].value);
    console.log('the accountId is '+this.recordId);
    this.selectedBranchId = event.target.dataset.id;
    console.log('the selectedBranchId in handle select is '+this.selectedBranchId);
    getBranchFamilyNumber({ branchId: this.selectedBranchId })
      .then((result) => {
        this.branchFamilyNumber = result;
        console.log('the branch family number is'+this.branchFamilyNumber);
      })
      .catch((error) => {
        this.showToast('Error', error?.body?.message ?? error.message, 'error');
      });
  }

  handleSave() {
    console.log('inside handle save');
    this.isLoading = true;
  
    if (!this.selectedBranchId || !this.branchFamilyNumber || !this.account?.data?.fields?.mdmrecid__c?.value) {
      this.showToast('Warning', 'Please select a branch and ensure all required data like Oracle Party Id and Branch Family is Present.', 'warning');
      this.isLoading = false;
      return;
    }
  
    
    checkExistingBranch({ accountId: this.recordId, branchId: this.selectedBranchId })
      .then((exists) => {
        if (exists) {
          this.showToast('Warning', 'An Account Branch Profile already exists for this branch.', 'warning');
          this.isLoading = false;
          return;
        }
  
        performGraphQLCheck({ branchId: this.branchFamilyNumber, partyId: this.account.data.fields.mdmrecid__c.value })
          .then((response) => {
            console.log('the Response: ', response);
            const responseData = JSON.parse(response);
            
            if (responseData && responseData.data && responseData.data.getGraphAccountForPartyAndBranchFamily) {
              this.accountNumber = responseData.data.getGraphAccountForPartyAndBranchFamily.accountNumber;
              this.mdmrecid = responseData.data.getGraphAccountForPartyAndBranchFamily.mdmrecid;
              this.createEbs = false;
            } else {
              
              this.showToast('Info', 'Branch data not found in GraphQL response. Proceeding with existing attributes.', 'info');
              this.createEbs = true;
              this.isLoading = false;
            }
  
           
            return createBranchProfile({
              accountId: this.recordId,
              branchId: this.selectedBranchId,
              accountNumber: this.accountNumber,
              mdmrecid: this.mdmrecid,
              createEbs: this.createEbs
            });
          })
          .then((result) => {
            this.showToast('Success', 'Branch Profile created successfully.', 'success');
            this.closePopup();
            this.navigateToBranchProfile(result);
            this.isLoading = false;
          })
          .catch((error) => {
            this.showToast('Error', error?.body?.message ?? error.message, 'error');
            this.isLoading = false;
          });
      })
      .catch((error) => {
        this.showToast('Error', error?.body?.message ?? error.message, 'error');
        this.isLoading = false;
      });
  }
  

  createBranchProfile() {
    this.isLoading = true;
    console.log('inside create Branch Profile');
    createBranchProfile({
      accountId: this.recordId,
      branchId: this.selectedBranchId,
      accountNumber: this.accountNumber,
      mdmrecid: this.mdmrecid,
      createEbs: this.createEbs
    })
      .then((result) => {
        this.isLoading = false;
        this.showToast('Success', 'Branch Profile created successfully.', 'success');
        this.navigateToBranchProfile(result);
      })
      .catch((error) => {
        this.isLoading = false;
        this.showToast('Error', error?.body?.message ?? error.message, 'error');
      });
  }

  showToast(title, message, variant) {
    const event = new ShowToastEvent({
      title,
      message,
      variant,
    });
    this.dispatchEvent(event);
  }

  get hasResults() {
    return this.branches.length > 0;
  }
  handleCancel() {

    this.closePopup();
}

  closePopup() {
    this.isSpinner = false;
    this.dispatchEvent(new CloseActionScreenEvent({ bubbles: true, composed: true }));
    
    const selectedEvent = new CustomEvent('close', {
        detail: {}
    });
    this.dispatchEvent(selectedEvent);
  }
}