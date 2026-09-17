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
  Router
} from '@angular/router';

import {
  LucideAngularModule,
  Search,
  MapPin,
  Eye,
  X,
  Building2,
  BookOpen,
  Plus,
  Pencil,
  Power,
  Trash2,
  Save
} from 'lucide-angular';

import {
  AdminKnowledgeService
} from '../services/admin-knowledge.service';


@Component({
  selector: 'app-knowledge-management',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],

  templateUrl:
    './knowledge-management.html',

  styleUrl:
    './knowledge-management.css'
})
export class KnowledgeManagementComponent
implements OnInit {

  places: any[] = [];

  loading = true;

  saving = false;

  deleting = false;

  errorMessage = '';

  successMessage = '';

  searchTerm = '';

  selectedArea = 'all';

  modalOpen = false;

  editingPlace: any = null;


  form = {
    name: '',
    area: '',
    price: 0,
    cost_price: 0,
    image: '',
    description: '',
    tagsText: '',
    active: true,
    sort_order: 0
  };


  readonly Search =
    Search;

  readonly MapPin =
    MapPin;

  readonly Eye =
    Eye;

  readonly X =
    X;

  readonly Building2 =
    Building2;

  readonly BookOpen =
    BookOpen;

  readonly Plus =
    Plus;

  readonly Pencil =
    Pencil;

  readonly Power =
    Power;

  readonly Trash2 =
    Trash2;

  readonly Save =
    Save;


  constructor(
    private knowledgeService:
      AdminKnowledgeService,

    private router:
      Router,

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
        await this.knowledgeService
          .getPlaces();


      this.places =
        Array.isArray(result)
          ? result
          : [];

    } catch (error) {

      console.error(
        'Admin knowledge places error:',
        error
      );


      this.errorMessage =
        'تعذر تحميل الأماكن.';

    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // AREAS
  // =========================================================

  get areas():
    string[] {

    return [
      ...new Set(
        this.places
          .map(
            place =>
              String(
                place?.area || ''
              ).trim()
          )
          .filter(Boolean)
      )
    ].sort();

  }


  // =========================================================
  // FILTERED
  // =========================================================

  get filteredPlaces():
    any[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.places.filter(
      place => {

        if (
          this.selectedArea !== 'all'
          &&
          String(
            place?.area || ''
          ) !== this.selectedArea
        ) {

          return false;

        }


        if (!search) {

          return true;

        }


        const tags =
          Array.isArray(
            place?.tags
          )
            ? place.tags
            : [];


        const searchable =
          [
            place?.name,
            place?.area,
            place?.description,
            ...tags
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();


        return searchable.includes(
          search
        );

      }
    );

  }


  // =========================================================
  // CREATE
  // =========================================================

  openCreate():
    void {

    this.editingPlace =
      null;


    this.form = {

      name: '',

      area: '',

      price: 0,

      cost_price: 0,

      image: '',

      description: '',

      tagsText: '',

      active: true,

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
    place: any
  ):
    void {

    this.editingPlace =
      place;


    this.form = {

      name:
        place.name || '',

      area:
        place.area || '',

      price:
        Number(
          place.price || 0
        ),

      cost_price:
        Number(
          place.cost_price || 0
        ),

      image:
        place.image || '',

      description:
        place.description || '',

      tagsText:
        Array.isArray(
          place.tags
        )
          ? place.tags.join(', ')
          : '',

      active:
        place.active !== false,

      sort_order:
        Number(
          place.sort_order || 0
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


    this.modalOpen = false;

    this.editingPlace = null;

  }


  // =========================================================
  // SAVE
  // =========================================================

  async savePlace():
    Promise<void> {

    if (this.saving) {

      return;

    }


    const name =
      this.form.name
        .trim();

    const area =
      this.form.area
        .trim();

    const price =
      Number(
        this.form.price
      );

    const costPrice =
      Number(
        this.form.cost_price
      );

    const sortOrder =
      Number(
        this.form.sort_order || 0
      );


    if (!name) {

      this.errorMessage =
        'Place name is required.';

      return;

    }


    if (!area) {

      this.errorMessage =
        'Area is required.';

      return;

    }


    if (
      !Number.isFinite(price)
      ||
      price < 0
    ) {

      this.errorMessage =
        'Please enter a valid selling price.';

      return;

    }


    if (
      !Number.isFinite(costPrice)
      ||
      costPrice < 0
    ) {

      this.errorMessage =
        'Please enter a valid cost price.';

      return;

    }


    if (
      costPrice > price
    ) {

      this.errorMessage =
        'Cost price cannot exceed selling price.';

      return;

    }


    const tags =
      this.form.tagsText
        .split(',')
        .map(
          tag =>
            tag.trim()
        )
        .filter(Boolean);


    const payload = {

      name,

      area,

      price,

      cost_price:
        costPrice,

      image:
        this.form.image
          .trim()
        || null,

      description:
        this.form.description
          .trim()
        || null,

      tags,

      active:
        this.form.active,

      sort_order:
        sortOrder

    };


    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';


    try {

      if (
        this.editingPlace
      ) {

        await this.knowledgeService
          .updatePlace(
            this.editingPlace.id,
            payload
          );


        this.successMessage =
          'Place updated successfully.';

      } else {

        await this.knowledgeService
          .createPlace(
            payload
          );


        this.successMessage =
          'Place added successfully.';

      }


      this.modalOpen = false;

      this.editingPlace = null;


      await this.loadPlaces();


    } catch (error) {

      console.error(
        'Save place error:',
        error
      );


      this.errorMessage =
        'Unable to save the place.';

    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // TOGGLE ACTIVE
  // =========================================================

  async togglePlace(
    place: any
  ):
    Promise<void> {

    if (
      !place?.id
    ) {

      return;

    }


    try {

      this.errorMessage = '';

      this.successMessage = '';


      await this.knowledgeService
        .togglePlace(
          place.id,
          !place.active
        );


      this.successMessage =
        place.active
          ? 'Place deactivated.'
          : 'Place activated.';


      await this.loadPlaces();


    } catch (error) {

      console.error(
        'Toggle place error:',
        error
      );


      this.errorMessage =
        'Unable to change place status.';

    }

  }


  // =========================================================
  // DELETE
  // =========================================================

  async deletePlace(
    place: any
  ):
    Promise<void> {

    if (
      !place?.id
      ||
      this.deleting
    ) {

      return;

    }


    const confirmed =
      window.confirm(
        `Delete "${place.name}"?`
      );


    if (!confirmed) {

      return;

    }


    this.deleting = true;

    this.errorMessage = '';

    this.successMessage = '';


    try {

      await this.knowledgeService
        .deletePlace(
          place.id
        );


      this.successMessage =
        'Place deleted successfully.';


      await this.loadPlaces();


    } catch (error) {

      console.error(
        'Delete place error:',
        error
      );


      this.errorMessage =
        'Unable to delete this place.';

    } finally {

      this.deleting = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // OPEN KNOWLEDGE
  // =========================================================

  async openPlace(
    place: any
  ):
    Promise<void> {

    if (!place?.id) {

      return;

    }


    await this.router.navigate([
      '/admin/knowledge-base',
      place.id
    ]);

  }


  // =========================================================
  // FILTERS
  // =========================================================

  clearFilters():
    void {

    this.searchTerm = '';

    this.selectedArea =
      'all';

  }


  get hasFilters():
    boolean {

    return (
      !!this.searchTerm.trim()
      ||
      this.selectedArea !== 'all'
    );

  }


  // =========================================================
  // TAGS
  // =========================================================

  getTags(
    place: any
  ):
    string[] {

    if (
      !Array.isArray(
        place?.tags
      )
    ) {

      return [];

    }


    return place.tags
      .filter(Boolean)
      .map(
        (tag: any) =>
          String(tag)
      )
      .slice(
        0,
        4
      );

  }


  // =========================================================
  // PRICE
  // =========================================================

  getPrice(
    place: any
  ):
    number | null {

    const value =
      Number(
        place?.price
      );


    if (
      !Number.isFinite(value)
      ||
      value <= 0
    ) {

      return null;

    }


    return value;

  }


  // =========================================================
  // COUNTS
  // =========================================================

  getCollectionCount(
    value: any
  ):
    number {

    if (!value) {

      return 0;

    }


    if (
      Array.isArray(value)
    ) {

      return value.length;

    }


    if (
      typeof value === 'object'
    ) {

      return Object.keys(
        value
      ).length;

    }


    return 0;

  }


  getPackageCount(
    place: any
  ):
    number {

    return this.getCollectionCount(
      place?.packages
    );

  }


  getServiceCount(
    place: any
  ):
    number {

    return this.getCollectionCount(
      place?.services
    );

  }


  getExtraCount(
    place: any
  ):
    number {

    return this.getCollectionCount(
      place?.extras
    );

  }


  // =========================================================
  // SORT ORDER
  // =========================================================

  private getNextSortOrder():
    number {

    if (
      this.places.length === 0
    ) {

      return 1;

    }


    return (
      Math.max(
        ...this.places.map(
          place =>
            Number(
              place?.sort_order || 0
            )
        )
      )
      +
      1
    );

  }


  // =========================================================
  // TRACK BY
  // =========================================================

  trackByPlaceId(
    index: number,
    place: any
  ):
    string | number {

    return (
      place?.id
      ||
      index
    );

  }

}