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
  Search,
  Pencil,
  X,
  Save,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Package
} from 'lucide-angular';

import {
  AccountWorkspaceService
} from '../services/account-workspace';


type PriceTargetType =
  | 'place'
  | 'package';


@Component({
  selector: 'app-account-prices',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],

  templateUrl:
    './account-prices.html',

  styleUrl:
    './account-prices.css'
})
export class AccountPricesComponent
implements OnInit {

  places: any[] = [];

  searchTerm = '';

  loading = true;

  saving = false;

  errorMessage = '';

  successMessage = '';


  // =========================================================
  // EXPANDED PACKAGES
  // =========================================================

  expandedPlaces =
    new Set<string>();


  // =========================================================
  // EDIT
  // =========================================================

  editingTarget:
    PriceTargetType | null =
      null;

  editingPlace: any =
    null;

  editingPackage: any =
    null;

  editingPackageIndex:
    number | null =
      null;


  sellingPrice = 0;

  costPrice = 0;


  // =========================================================
  // ICONS
  // =========================================================

  readonly Search =
    Search;

  readonly Pencil =
    Pencil;

  readonly X =
    X;

  readonly Save =
    Save;

  readonly RefreshCw =
    RefreshCw;

  readonly ChevronDown =
    ChevronDown;

  readonly ChevronUp =
    ChevronUp;

  readonly Package =
    Package;


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

    await this.loadPlaces();

  }


  // =========================================================
  // LOAD
  // =========================================================

  async loadPlaces():
    Promise<void> {

    this.loading = true;

    this.errorMessage = '';


    try {

      const result =
        await this.accountService
          .getPlacesFinancials();


      this.places =
        Array.isArray(result)
          ? result
          : [];


    } catch (error) {

      console.error(
        'Load place prices error:',
        error
      );


      this.errorMessage =
        'Unable to load place prices.';

    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // FILTER
  // =========================================================

  get filteredPlaces():
    any[] {

    const term =
      this.searchTerm
        .trim()
        .toLowerCase();


    if (!term) {

      return this.places;

    }


    return this.places.filter(
      place => {

        const packageNames =
          this.getPackages(place)
            .map(
              item =>
                String(
                  item?.name || ''
                )
            )
            .join(' ');


        const searchable =
          [
            place?.name,
            place?.area,
            packageNames
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();


        return searchable.includes(
          term
        );

      }
    );

  }


  // =========================================================
  // PACKAGES
  // =========================================================

  getPackages(
    place: any
  ):
    any[] {

    if (
      Array.isArray(
        place?.packages
      )
    ) {

      return place.packages;

    }


    if (
      place?.packages
      &&
      typeof place.packages === 'object'
    ) {

      return Object.values(
        place.packages
      );

    }


    return [];

  }


  hasPackages(
    place: any
  ):
    boolean {

    return (
      this.getPackages(place)
        .length > 0
    );

  }


  // =========================================================
  // EXPAND
  // =========================================================

  togglePackages(
    place: any
  ):
    void {

    if (!place?.id) {

      return;

    }


    if (
      this.expandedPlaces
        .has(place.id)
    ) {

      this.expandedPlaces
        .delete(place.id);

    } else {

      this.expandedPlaces
        .add(place.id);

    }


    this.cdr.markForCheck();

  }


  isExpanded(
    place: any
  ):
    boolean {

    return (
      !!place?.id
      &&
      this.expandedPlaces
        .has(place.id)
    );

  }


  // =========================================================
  // PLACE FINANCIALS
  // =========================================================

  getPlaceSellingPrice(
    place: any
  ):
    number {

    return Number(
      place?.selling_price
      ??
      place?.price
      ??
      0
    );

  }


  getPlaceCostPrice(
    place: any
  ):
    number {

    return Number(
      place?.cost_price
      ?? 0
    );

  }


  getPlaceProfit(
    place: any
  ):
    number {

    return (
      this.getPlaceSellingPrice(
        place
      )
      -
      this.getPlaceCostPrice(
        place
      )
    );

  }


  getPlaceMargin(
    place: any
  ):
    number {

    const selling =
      this.getPlaceSellingPrice(
        place
      );


    if (selling <= 0) {

      return 0;

    }


    return (
      this.getPlaceProfit(place)
      /
      selling
      *
      100
    );

  }


  // =========================================================
  // PACKAGE FINANCIALS
  // =========================================================

  getPackageSellingPrice(
    item: any
  ):
    number {

    /*
     * Old packages may only contain "price".
     * We use it as selling price until the
     * package is saved with selling_price.
     */

    return Number(
      item?.selling_price
      ??
      item?.price
      ??
      0
    );

  }


  getPackageCostPrice(
    item: any
  ):
    number {

    return Number(
      item?.cost_price
      ?? 0
    );

  }


  getPackageProfit(
    item: any
  ):
    number {

    return (
      this.getPackageSellingPrice(
        item
      )
      -
      this.getPackageCostPrice(
        item
      )
    );

  }


  getPackageMargin(
    item: any
  ):
    number {

    const selling =
      this.getPackageSellingPrice(
        item
      );


    if (selling <= 0) {

      return 0;

    }


    return (
      this.getPackageProfit(item)
      /
      selling
      *
      100
    );

  }


  // =========================================================
  // EDIT PLACE PRICE
  // =========================================================

  openPlaceEdit(
    place: any
  ):
    void {

    this.editingTarget =
      'place';

    this.editingPlace =
      place;

    this.editingPackage =
      null;

    this.editingPackageIndex =
      null;


    this.sellingPrice =
      this.getPlaceSellingPrice(
        place
      );


    this.costPrice =
      this.getPlaceCostPrice(
        place
      );


    this.errorMessage = '';

    this.successMessage = '';

  }


  // =========================================================
  // EDIT PACKAGE PRICE
  // =========================================================

  openPackageEdit(
    place: any,
    item: any,
    index: number
  ):
    void {

    this.editingTarget =
      'package';

    this.editingPlace =
      place;

    this.editingPackage =
      item;

    this.editingPackageIndex =
      index;


    this.sellingPrice =
      this.getPackageSellingPrice(
        item
      );


    this.costPrice =
      this.getPackageCostPrice(
        item
      );


    this.errorMessage = '';

    this.successMessage = '';

  }


  // =========================================================
  // CLOSE
  // =========================================================

  closeEdit():
    void {

    if (this.saving) {

      return;

    }


    this.editingTarget =
      null;

    this.editingPlace =
      null;

    this.editingPackage =
      null;

    this.editingPackageIndex =
      null;

  }


  // =========================================================
  // LIVE PROFIT
  // =========================================================

  get editProfit():
    number {

    return (
      Number(
        this.sellingPrice || 0
      )
      -
      Number(
        this.costPrice || 0
      )
    );

  }


  // =========================================================
  // LIVE MARGIN
  // =========================================================

  get editMargin():
    number {

    const selling =
      Number(
        this.sellingPrice || 0
      );


    if (selling <= 0) {

      return 0;

    }


    return (
      this.editProfit
      /
      selling
      *
      100
    );

  }


  // =========================================================
  // SAVE
  // =========================================================

  async savePrices():
    Promise<void> {

    if (
      !this.editingTarget
      ||
      !this.editingPlace
      ||
      this.saving
    ) {

      return;

    }


    const selling =
      Number(
        this.sellingPrice
      );


    const cost =
      Number(
        this.costPrice
      );


    if (
      !Number.isFinite(selling)
      ||
      !Number.isFinite(cost)
      ||
      selling < 0
      ||
      cost < 0
    ) {

      this.errorMessage =
        'Please enter valid prices.';

      return;

    }


    if (cost > selling) {

      this.errorMessage =
        'Cost Price cannot exceed Selling Price.';

      return;

    }


    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';


    try {

      // =====================================================
      // PLACE
      // =====================================================

      if (
        this.editingTarget ===
          'place'
      ) {

        await this.accountService
          .updatePlacePrices(
            this.editingPlace.id,
            selling,
            cost
          );


        this.successMessage =
          'Place prices updated successfully.';

      }


      // =====================================================
      // PACKAGE
      // =====================================================

      if (
        this.editingTarget ===
          'package'
        &&
        this.editingPackageIndex
          !== null
      ) {

        const packages =
          this.getPackages(
            this.editingPlace
          )
            .map(
              item => ({
                ...item
              })
            );


        const current =
          packages[
            this.editingPackageIndex
          ];


        if (!current) {

          throw new Error(
            'Package not found.'
          );

        }


        packages[
          this.editingPackageIndex
        ] = {

          ...current,

          /*
           * Keep price for compatibility
           * with existing Agent / customer UI.
           */

          price:
            selling,

          selling_price:
            selling,

          cost_price:
            cost

        };


        await this.accountService
          .updatePlacePackages(
            this.editingPlace.id,
            packages
          );


        this.successMessage =
          'Package prices updated successfully.';

      }


      const placeId =
        this.editingPlace.id;


      await this.loadPlaces();


      if (
        this.editingTarget ===
          'package'
      ) {

        this.expandedPlaces
          .add(placeId);

      }


      this.closeEdit();


    } catch (error) {

      console.error(
        'Save prices error:',
        error
      );


      this.errorMessage =
        'Unable to update prices.';

    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // FORMAT MONEY
  // =========================================================

  formatMoney(
    value: number
  ):
    string {

    return new Intl.NumberFormat(
      'en-EG',
      {
        maximumFractionDigits: 2
      }
    ).format(
      Number(
        value || 0
      )
    );

  }

}