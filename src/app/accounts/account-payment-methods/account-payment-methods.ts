import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  LucideAngularModule,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  RefreshCw,
  CreditCard,
  Search,
  Power
} from 'lucide-angular';

import {
  AccountWorkspaceService
} from '../services/account-workspace';


type PaymentType =
  | 'bank_transfer'
  | 'payment_link';


@Component({
  selector: 'app-account-payment-methods',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],

  templateUrl:
    './account-payment-methods.html',

  styleUrl:
    './account-payment-methods.css'
})
export class AccountPaymentMethodsComponent
implements OnInit {

  methods: any[] = [];

  searchTerm = '';

  loading = true;

  saving = false;

  deleting = false;

  errorMessage = '';

  successMessage = '';

  modalOpen = false;

  editingMethod: any = null;


  form: {
    name: string;
    code: string;
    payment_type: PaymentType;
    fee_percent: number;
    payment_url: string;
    instructions: string;
    account_name: string;
    account_number: string;
    active: boolean;
    sort_order: number;
  } = {
    name: '',
    code: '',
    payment_type:
      'bank_transfer',
    fee_percent: 0,
    payment_url: '',
    instructions: '',
    account_name: '',
    account_number: '',
    active: true,
    sort_order: 0
  };


  readonly Plus =
    Plus;

  readonly Pencil =
    Pencil;

  readonly Trash2 =
    Trash2;

  readonly X =
    X;

  readonly Save =
    Save;

  readonly RefreshCw =
    RefreshCw;

  readonly CreditCard =
    CreditCard;

  readonly Search =
    Search;

  readonly Power =
    Power;


  constructor(
    private accountService:
      AccountWorkspaceService,

    private cdr:
      ChangeDetectorRef
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  async ngOnInit():
    Promise<void> {

    await this.loadMethods();

  }


  // =========================================================
  // LOAD
  // =========================================================

  async loadMethods():
    Promise<void> {

    this.loading = true;

    this.errorMessage = '';

    try {

      this.methods =
        await this.accountService
          .getPaymentMethods();

    } catch (error) {

      console.error(
        'Load payment methods error:',
        error
      );

      this.errorMessage =
        'Unable to load payment methods.';

    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // FILTER
  // =========================================================

  get filteredMethods():
    any[] {

    const term =
      this.searchTerm
        .trim()
        .toLowerCase();


    if (!term) {

      return this.methods;

    }


    return this.methods.filter(
      method => {

        return (
          String(method.name || '')
            .toLowerCase()
            .includes(term)

          ||

          String(method.code || '')
            .toLowerCase()
            .includes(term)

          ||

          String(
            method.payment_type || ''
          )
            .toLowerCase()
            .includes(term)
        );

      }
    );

  }


  // =========================================================
  // CREATE
  // =========================================================

  openCreate():
    void {

    this.editingMethod =
      null;


    this.form = {

      name: '',

      code: '',

      payment_type:
        'bank_transfer',

      fee_percent:
        0,

      payment_url:
        '',

      instructions:
        '',

      account_name:
        '',

      account_number:
        '',

      active:
        true,

      sort_order:
        this.getNextSortOrder()

    };


    this.errorMessage = '';

    this.successMessage = '';

    this.modalOpen = true;

  }


  // =========================================================
  // EDIT
  // =========================================================

  openEdit(
    method: any
  ):
    void {

    this.editingMethod =
      method;


    this.form = {

      name:
        method.name || '',

      code:
        method.code || '',

      payment_type:
        this.normalizePaymentType(
          method.payment_type
        ),

      fee_percent:
        Number(
          method.fee_percent || 0
        ),

      payment_url:
        method.payment_url || '',

      instructions:
        method.instructions || '',

      account_name:
        method.account_name || '',

      account_number:
        method.account_number || '',

      active:
        method.active !== false,

      sort_order:
        Number(
          method.sort_order || 0
        )

    };


    this.errorMessage = '';

    this.successMessage = '';

    this.modalOpen = true;

  }


  // =========================================================
  // CLOSE MODAL
  // =========================================================

  closeModal():
    void {

    if (
      this.saving
      ||
      this.deleting
    ) {

      return;

    }


    this.modalOpen =
      false;

    this.editingMethod =
      null;

  }


  // =========================================================
  // PAYMENT TYPE CHANGE
  // =========================================================

  onPaymentTypeChange():
    void {

    if (
      this.form.payment_type ===
      'bank_transfer'
    ) {

      this.form.payment_url =
        '';

      return;

    }


    if (
      this.form.payment_type ===
      'payment_link'
    ) {

      this.form.account_name =
        '';

      this.form.account_number =
        '';

    }

  }


  // =========================================================
  // SAVE
  // =========================================================

  async saveMethod():
    Promise<void> {

    if (
      this.saving
    ) {

      return;

    }


    const name =
      this.form.name
        .trim();


    const code =
      this.form.code
        .trim()
        .toLowerCase();


    const feePercent =
      Number(
        this.form.fee_percent
      );


    const sortOrder =
      Number(
        this.form.sort_order || 0
      );


    // -------------------------------------------------------
    // BASIC VALIDATION
    // -------------------------------------------------------

    if (!name) {

      this.errorMessage =
        'Method Name is required.';

      return;

    }


    if (!code) {

      this.errorMessage =
        'Code is required.';

      return;

    }


    if (
      !this.isValidCode(code)
    ) {

      this.errorMessage =
        'Code may contain lowercase letters, numbers and underscores only.';

      return;

    }


    if (
      !Number.isFinite(
        feePercent
      )
      ||
      feePercent < 0
    ) {

      this.errorMessage =
        'Please enter a valid fee percentage.';

      return;

    }


    if (
      !Number.isFinite(
        sortOrder
      )
      ||
      sortOrder < 0
    ) {

      this.errorMessage =
        'Please enter a valid sort order.';

      return;

    }


    // -------------------------------------------------------
    // PAYMENT LINK VALIDATION
    // -------------------------------------------------------

    const paymentUrl =
      this.form.payment_url
        .trim();


    if (
      this.form.payment_type ===
        'payment_link'
      &&
      paymentUrl
      &&
      !this.isValidUrl(
        paymentUrl
      )
    ) {

      this.errorMessage =
        'Please enter a valid payment URL.';

      return;

    }


    this.saving =
      true;

    this.errorMessage =
      '';

    this.successMessage =
      '';


    try {

      const payload = {

        name,

        code,

        payment_type:
          this.form.payment_type,

        fee_percent:
          feePercent,

        payment_url:
          this.form.payment_type ===
            'payment_link'
            ? paymentUrl || null
            : null,

        instructions:
          this.form.instructions
            .trim()
          || null,

        account_name:
          this.form.payment_type ===
            'bank_transfer'
            ? (
              this.form.account_name
                .trim()
              || null
            )
            : null,

        account_number:
          this.form.payment_type ===
            'bank_transfer'
            ? (
              this.form.account_number
                .trim()
              || null
            )
            : null,

        active:
          this.form.active,

        sort_order:
          sortOrder

      };


      if (
        this.editingMethod
      ) {

        await this.accountService
          .updatePaymentMethod(
            this.editingMethod.id,
            payload
          );


        this.successMessage =
          'Payment method updated successfully.';

      } else {

        await this.accountService
          .createPaymentMethod(
            payload
          );


        this.successMessage =
          'Payment method added successfully.';

      }


      this.modalOpen =
        false;


      this.editingMethod =
        null;


      await this.loadMethods();


    } catch (error: any) {

      console.error(
        'Save payment method error:',
        error
      );


      if (
        error?.code ===
        '23505'
      ) {

        this.errorMessage =
          'This payment method code is already in use.';

      } else {

        this.errorMessage =
          'Unable to save payment method.';

      }


    } finally {

      this.saving =
        false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // TOGGLE
  // =========================================================

  async toggleMethod(
    method: any
  ):
    Promise<void> {

    try {

      this.errorMessage =
        '';

      this.successMessage =
        '';


      await this.accountService
        .togglePaymentMethod(
          method.id,
          !method.active
        );


      this.successMessage =
        method.active
          ? 'Payment method deactivated.'
          : 'Payment method activated.';


      await this.loadMethods();


    } catch (error) {

      console.error(
        'Toggle payment method error:',
        error
      );


      this.errorMessage =
        'Unable to change payment method status.';

    }

  }


  // =========================================================
  // DELETE
  // =========================================================

  async deleteMethod(
    method: any
  ):
    Promise<void> {

    if (
      this.deleting
    ) {

      return;

    }


    const confirmed =
      window.confirm(
        `Delete payment method "${method.name}"?`
      );


    if (
      !confirmed
    ) {

      return;

    }


    this.deleting =
      true;

    this.errorMessage =
      '';

    this.successMessage =
      '';


    try {

      await this.accountService
        .deletePaymentMethod(
          method.id
        );


      this.successMessage =
        'Payment method deleted successfully.';


      await this.loadMethods();


    } catch (error) {

      console.error(
        'Delete payment method error:',
        error
      );


      this.errorMessage =
        'Unable to delete this payment method. Deactivate it if it is already linked to previous requests.';

    } finally {

      this.deleting =
        false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // TYPE LABEL
  // =========================================================

  getPaymentTypeLabel(
    value: string |
      null |
      undefined
  ):
    string {

    if (
      value ===
      'payment_link'
    ) {

      return 'Payment Link';

    }


    return 'Bank Transfer';

  }


  // =========================================================
  // SECONDARY TYPE LABEL
  // =========================================================

  getPaymentTypeArabicLabel(
    value: string |
      null |
      undefined
  ):
    string {

    if (
      value ===
      'payment_link'
    ) {

      return 'رابط دفع';

    }


    return 'تحويل بنكي';

  }


  // =========================================================
  // PAYMENT LINK LABEL
  // =========================================================

  getPaymentLinkLabel(
    method: any
  ):
    string {

    if (
      method?.payment_url
    ) {

      return method.payment_url;

    }


    return 'Generated per request';

  }


  // =========================================================
  // FEE
  // =========================================================

  formatPercent(
    value: any
  ):
    string {

    const amount =
      Number(
        value || 0
      );


    return `${amount}%`;

  }


  // =========================================================
  // NEXT SORT ORDER
  // =========================================================

  private getNextSortOrder():
    number {

    if (
      this.methods.length === 0
    ) {

      return 1;

    }


    const values =
      this.methods.map(
        method =>
          Number(
            method.sort_order || 0
          )
      );


    return (
      Math.max(
        ...values
      )
      +
      1
    );

  }


  // =========================================================
  // NORMALIZE TYPE
  // =========================================================

  private normalizePaymentType(
    value: any
  ):
    PaymentType {

    if (
      value ===
      'payment_link'
    ) {

      return 'payment_link';

    }


    return 'bank_transfer';

  }


  // =========================================================
  // CODE VALIDATION
  // =========================================================

  private isValidCode(
    value: string
  ):
    boolean {

    return /^[a-z0-9_]+$/
      .test(
        value
      );

  }


  // =========================================================
  // URL VALIDATION
  // =========================================================

  private isValidUrl(
    value: string
  ):
    boolean {

    try {

      const url =
        new URL(
          value
        );


      return (
        url.protocol ===
          'http:'
        ||
        url.protocol ===
          'https:'
      );


    } catch {

      return false;

    }

  }

}