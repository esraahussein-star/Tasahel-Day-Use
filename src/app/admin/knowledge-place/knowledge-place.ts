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
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  LucideAngularModule,
  ArrowRight,
  Building2,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Power,
  MapPin,
  Search
} from 'lucide-angular';

import {
  AdminKnowledgeService
} from '../services/admin-knowledge.service';


type TabType =
  | 'overview'
  | 'packages'
  | 'services'
  | 'extras'
  | 'knowledge';


type ItemType =
  | 'package'
  | 'service'
  | 'extra';


@Component({
  selector: 'app-knowledge-place',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],

  templateUrl: './knowledge-place.html',

  styleUrl: './knowledge-place.css'
})
export class KnowledgePlaceComponent
implements OnInit {

  // =========================================================
  // PAGE
  // =========================================================

  placeId = '';

  place: any = null;

  allPlaces: any[] = [];

  knowledgeItems: any[] = [];

  loading = true;

  saving = false;

  deleting = false;

  errorMessage = '';

  successMessage = '';

  activeTab: TabType =
    'overview';


  // =========================================================
  // PLACE EDIT
  // =========================================================

  placeEditOpen = false;

  placeForm = {

    name: '',

    area: '',

    price: 0,

    cost_price: 0,

    image: '',

    description: '',

    active: true

  };


  // =========================================================
  // PLACE TAGS
  // =========================================================

  availableTags: string[] = [];

  selectedTags: string[] = [];

  tagSearch = '';

  tagDropdownOpen = false;


  // =========================================================
  // PACKAGE / SERVICE / EXTRA
  // =========================================================

  itemModalOpen = false;

  itemType: ItemType | null =
    null;

  editingItemIndex: number | null =
    null;

  itemForm = {

    name: '',

    description: '',

    price: 0

  };


  // =========================================================
  // Q&A KNOWLEDGE
  // =========================================================

  knowledgeModalOpen = false;

  editingKnowledge: any =
    null;

  knowledgeForm = {

    title: '',

    content: '',

    priority: 0,

    active: true

  };

  knowledgeSelectedTags: string[] =
    [];

  knowledgeTagSearch = '';

  knowledgeTagDropdownOpen =
    false;


  // =========================================================
  // ICONS
  // =========================================================

  readonly ArrowRight =
    ArrowRight;

  readonly Building2 =
    Building2;

  readonly Plus =
    Plus;

  readonly Pencil =
    Pencil;

  readonly Trash2 =
    Trash2;

  readonly Save =
    Save;

  readonly X =
    X;

  readonly Power =
    Power;

  readonly MapPin =
    MapPin;

  readonly Search =
    Search;


  constructor(
    private route:
      ActivatedRoute,

    private router:
      Router,

    private knowledgeService:
      AdminKnowledgeService,

    private cdr:
      ChangeDetectorRef
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  async ngOnInit():
    Promise<void> {

    this.placeId =
      this.route.snapshot
        .paramMap
        .get('id')
      || '';


    if (!this.placeId) {

      await this.router.navigate([
        '/admin/knowledge-base'
      ]);

      return;

    }


    await this.loadPage();

  }


  // =========================================================
  // LOAD PAGE
  // =========================================================

  async loadPage():
    Promise<void> {

    this.loading = true;

    this.errorMessage = '';


    try {

      const [
        place,
        knowledge,
        places
      ] =
        await Promise.all([

          this.knowledgeService
            .getPlaceById(
              this.placeId
            ),

          this.knowledgeService
            .getPlaceKnowledge(
              this.placeId
            ),

          this.knowledgeService
            .getPlaces()

        ]);


      this.place =
        place;


      this.knowledgeItems =
        Array.isArray(
          knowledge
        )
          ? knowledge
          : [];


      this.allPlaces =
        Array.isArray(
          places
        )
          ? places
          : [];


      this.buildAvailableTags();


      if (!this.place) {

        this.errorMessage =
          'Place not found.';

      }


    } catch (error) {

      console.error(
        'Knowledge place load error:',
        error
      );


      this.errorMessage =
        'Unable to load place details.';

    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // BACK
  // =========================================================

  async goBack():
    Promise<void> {

    await this.router.navigate([
      '/admin/knowledge-base'
    ]);

  }


  // =========================================================
  // TABS
  // =========================================================

  setTab(
    tab: TabType
  ):
    void {

    this.activeTab =
      tab;

  }


  // =========================================================
  // CURRENT PLACE TAGS
  // =========================================================

  getPlaceTags():
    string[] {

    if (
      !Array.isArray(
        this.place?.tags
      )
    ) {

      return [];

    }


    return this.place.tags
      .filter(Boolean)
      .map(
        (tag: any) =>
          String(tag)
      );

  }


  // =========================================================
  // BUILD GLOBAL TAG LIST
  // =========================================================

  private buildAvailableTags():
    void {

    const tags: string[] =
      [];


    for (
      const place
      of this.allPlaces
    ) {

      if (
        !Array.isArray(
          place?.tags
        )
      ) {

        continue;

      }


      for (
        const rawTag
        of place.tags
      ) {

        const tag =
          String(
            rawTag || ''
          ).trim();


        if (!tag) {

          continue;

        }


        const exists =
          tags.some(
            current =>
              current.toLowerCase()
              ===
              tag.toLowerCase()
          );


        if (!exists) {

          tags.push(
            tag
          );

        }

      }

    }


    this.availableTags =
      tags.sort(
        (a, b) =>
          a.localeCompare(
            b,
            undefined,
            {
              sensitivity: 'base'
            }
          )
      );

  }


  // =========================================================
  // PLACE TAG SEARCH
  // =========================================================

  get filteredAvailableTags():
    string[] {

    const search =
      this.tagSearch
        .trim()
        .toLowerCase();


    return this.availableTags
      .filter(
        tag => {

          const selected =
            this.selectedTags.some(
              current =>
                current.toLowerCase()
                ===
                tag.toLowerCase()
            );


          if (selected) {

            return false;

          }


          if (!search) {

            return true;

          }


          return tag
            .toLowerCase()
            .includes(
              search
            );

        }
      )
      .slice(
        0,
        12
      );

  }


  // =========================================================
  // CAN CREATE PLACE TAG
  // =========================================================

  get canAddNewTag():
    boolean {

    const value =
      this.tagSearch
        .trim();


    if (!value) {

      return false;

    }


    return ![
      ...this.availableTags,
      ...this.selectedTags
    ]
      .some(
        tag =>
          tag.toLowerCase()
          ===
          value.toLowerCase()
      );

  }


  // =========================================================
  // SELECT PLACE TAG
  // =========================================================

  selectTag(
    tag: string
  ):
    void {

    const value =
      String(
        tag || ''
      ).trim();


    if (!value) {

      return;

    }


    const exists =
      this.selectedTags
        .some(
          current =>
            current.toLowerCase()
            ===
            value.toLowerCase()
        );


    if (!exists) {

      this.selectedTags.push(
        value
      );

    }


    this.tagSearch = '';

  }


  // =========================================================
  // CREATE PLACE TAG
  // =========================================================

  addNewTag():
    void {

    const value =
      this.tagSearch
        .trim();


    if (
      !value
      ||
      !this.canAddNewTag
    ) {

      return;

    }


    this.selectedTags.push(
      value
    );


    this.addTagToAvailableList(
      value
    );


    this.tagSearch = '';

    this.tagDropdownOpen =
      false;

  }


  // =========================================================
  // REMOVE PLACE TAG
  // =========================================================

  removeSelectedTag(
    tag: string
  ):
    void {

    this.selectedTags =
      this.selectedTags.filter(
        value =>
          value !== tag
      );

  }


  // =========================================================
  // ADD TAG TO AVAILABLE LIST
  // =========================================================

  private addTagToAvailableList(
    tag: string
  ):
    void {

    const value =
      tag.trim();


    if (!value) {

      return;

    }


    const exists =
      this.availableTags
        .some(
          current =>
            current.toLowerCase()
            ===
            value.toLowerCase()
        );


    if (!exists) {

      this.availableTags.push(
        value
      );


      this.availableTags.sort(
        (a, b) =>
          a.localeCompare(
            b,
            undefined,
            {
              sensitivity: 'base'
            }
          )
      );

    }

  }


  // =========================================================
  // OPEN PLACE EDIT
  // =========================================================

  openPlaceEdit():
    void {

    if (!this.place) {

      return;

    }


    this.placeForm = {

      name:
        this.place.name
        || '',

      area:
        this.place.area
        || '',

      price:
        Number(
          this.place.price
          || 0
        ),

      cost_price:
        Number(
          this.place.cost_price
          || 0
        ),

      image:
        this.place.image
        || '',

      description:
        this.place.description
        || '',

      active:
        this.place.active
        !== false

    };


    this.selectedTags = [
      ...this.getPlaceTags()
    ];


    this.tagSearch = '';

    this.tagDropdownOpen =
      false;

    this.errorMessage = '';

    this.successMessage = '';

    this.placeEditOpen =
      true;

  }


  // =========================================================
  // CLOSE PLACE EDIT
  // =========================================================

  closePlaceEdit():
    void {

    if (this.saving) {

      return;

    }


    this.placeEditOpen =
      false;

    this.tagDropdownOpen =
      false;

    this.tagSearch = '';

  }


  // =========================================================
  // SAVE PLACE
  // =========================================================

  async savePlaceOverview():
    Promise<void> {

    if (
      !this.place
      ||
      this.saving
    ) {

      return;

    }


    const name =
      this.placeForm.name
        .trim();


    const area =
      this.placeForm.area
        .trim();


    const price =
      Number(
        this.placeForm.price
      );


    const costPrice =
      Number(
        this.placeForm.cost_price
      );


    if (!name) {

      this.errorMessage =
        'Place Name is required.';

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
        'Please enter a valid Selling Price.';

      return;

    }


    if (
      !Number.isFinite(
        costPrice
      )
      ||
      costPrice < 0
    ) {

      this.errorMessage =
        'Please enter a valid Cost Price.';

      return;

    }


    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';


    try {

      await this.knowledgeService
        .updatePlace(
          this.placeId,
          {

            name,

            area,

            price,

            cost_price:
              costPrice,

            image:
              this.placeForm.image
                .trim()
              || null,

            description:
              this.placeForm.description
                .trim()
              || null,

            tags: [
              ...this.selectedTags
            ],

            active:
              this.placeForm.active

          }
        );


      this.placeEditOpen =
        false;


      this.successMessage =
        'Place updated successfully.';


      await this.loadPage();


    } catch (error) {

      console.error(
        'Update place error:',
        error
      );


      this.errorMessage =
        'Unable to update place.';

    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // COLLECTIONS
  // =========================================================

  get packages():
    any[] {

    return this.normalizeCollection(
      this.place?.packages
    );

  }


  get services():
    any[] {

    return this.normalizeCollection(
      this.place?.services
    );

  }


  get extras():
    any[] {

    return this.normalizeCollection(
      this.place?.extras
    );

  }


  private normalizeCollection(
    value: any
  ):
    any[] {

    if (
      Array.isArray(value)
    ) {

      return value;

    }


    if (
      value
      &&
      typeof value === 'object'
    ) {

      return Object.values(
        value
      );

    }


    return [];

  }


  // =========================================================
  // CREATE ITEM
  // =========================================================

  openItemCreate(
    type: ItemType
  ):
    void {

    this.itemType =
      type;

    this.editingItemIndex =
      null;


    this.itemForm = {

      name: '',

      description: '',

      price: 0

    };


    this.errorMessage = '';

    this.successMessage = '';

    this.itemModalOpen =
      true;

  }


  // =========================================================
  // EDIT ITEM
  // =========================================================

  openItemEdit(
    type: ItemType,
    index: number,
    item: any
  ):
    void {

    this.itemType =
      type;

    this.editingItemIndex =
      index;


    this.itemForm = {

      name:
        item?.name
        || '',

      description:
        item?.description
        || '',

      price:
        Number(
          item?.price
          || 0
        )

    };


    this.errorMessage = '';

    this.successMessage = '';

    this.itemModalOpen =
      true;

  }


  // =========================================================
  // CLOSE ITEM
  // =========================================================

  closeItemModal():
    void {

    if (this.saving) {

      return;

    }


    this.itemModalOpen =
      false;

    this.itemType =
      null;

    this.editingItemIndex =
      null;

  }


  // =========================================================
  // SAVE ITEM
  // =========================================================

  async saveItem():
    Promise<void> {

    if (
      !this.itemType
      ||
      this.saving
    ) {

      return;

    }


    const name =
      this.itemForm.name
        .trim();


    const price =
      Number(
        this.itemForm.price
        || 0
      );


    if (!name) {

      this.errorMessage =
        'Name is required.';

      return;

    }


    if (
      !Number.isFinite(price)
      ||
      price < 0
    ) {

      this.errorMessage =
        'Please enter a valid price.';

      return;

    }


    const item = {

      name,

      description:
        this.itemForm.description
          .trim()
        || '',

      price

    };


    const collection =
      this.getCollectionByType(
        this.itemType
      );


    if (
      this.editingItemIndex
      === null
    ) {

      collection.push(
        item
      );

    } else {

      collection[
        this.editingItemIndex
      ] =
        item;

    }


    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';


    try {

      await this.saveCollection(
        this.itemType,
        collection
      );


      this.itemModalOpen =
        false;


      this.successMessage =
        'Saved successfully.';


      await this.loadPage();


    } catch (error) {

      console.error(
        'Save item error:',
        error
      );


      this.errorMessage =
        'Unable to save changes.';

    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // DELETE ITEM
  // =========================================================

  async deleteItem(
    type: ItemType,
    index: number,
    item: any
  ):
    Promise<void> {

    if (this.deleting) {

      return;

    }


    const confirmed =
      window.confirm(
        `Delete "${item?.name || 'item'}"?`
      );


    if (!confirmed) {

      return;

    }


    const collection =
      this.getCollectionByType(
        type
      );


    collection.splice(
      index,
      1
    );


    this.deleting = true;

    this.errorMessage = '';

    this.successMessage = '';


    try {

      await this.saveCollection(
        type,
        collection
      );


      this.successMessage =
        'Deleted successfully.';


      await this.loadPage();


    } catch (error) {

      console.error(
        'Delete item error:',
        error
      );


      this.errorMessage =
        'Unable to delete item.';

    } finally {

      this.deleting = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // GET COLLECTION
  // =========================================================

  private getCollectionByType(
    type: ItemType
  ):
    any[] {

    if (
      type === 'package'
    ) {

      return [
        ...this.packages
      ];

    }


    if (
      type === 'service'
    ) {

      return [
        ...this.services
      ];

    }


    return [
      ...this.extras
    ];

  }


  // =========================================================
  // SAVE COLLECTION
  // =========================================================

  private async saveCollection(
    type: ItemType,
    collection: any[]
  ):
    Promise<void> {

    if (
      type === 'package'
    ) {

      await this.knowledgeService
        .updatePackages(
          this.placeId,
          collection
        );

      return;

    }


    if (
      type === 'service'
    ) {

      await this.knowledgeService
        .updateServices(
          this.placeId,
          collection
        );

      return;

    }


    await this.knowledgeService
      .updateExtras(
        this.placeId,
        collection
      );

  }


  // =========================================================
  // Q&A TAGS
  // =========================================================

  get filteredKnowledgeTags():
    string[] {

    const search =
      this.knowledgeTagSearch
        .trim()
        .toLowerCase();


    return this.availableTags
      .filter(
        tag => {

          const selected =
            this.knowledgeSelectedTags
              .some(
                current =>
                  current.toLowerCase()
                  ===
                  tag.toLowerCase()
              );


          if (selected) {

            return false;

          }


          if (!search) {

            return true;

          }


          return tag
            .toLowerCase()
            .includes(
              search
            );

        }
      )
      .slice(
        0,
        12
      );

  }


  // =========================================================
  // CAN ADD NEW Q&A TAG
  // =========================================================

  get canAddNewKnowledgeTag():
    boolean {

    const value =
      this.knowledgeTagSearch
        .trim();


    if (!value) {

      return false;

    }


    const exists =
      [
        ...this.availableTags,
        ...this.knowledgeSelectedTags
      ]
        .some(
          tag =>
            tag.toLowerCase()
            ===
            value.toLowerCase()
        );


    return !exists;

  }


  // =========================================================
  // SELECT Q&A TAG
  // =========================================================

  selectKnowledgeTag(
    tag: string
  ):
    void {

    const value =
      String(
        tag || ''
      ).trim();


    if (!value) {

      return;

    }


    const exists =
      this.knowledgeSelectedTags
        .some(
          current =>
            current.toLowerCase()
            ===
            value.toLowerCase()
        );


    if (!exists) {

      this.knowledgeSelectedTags
        .push(
          value
        );

    }


    this.knowledgeTagSearch =
      '';

  }


  // =========================================================
  // ADD NEW Q&A TAG
  // =========================================================

  addNewKnowledgeTag():
    void {

    const value =
      this.knowledgeTagSearch
        .trim();


    if (
      !value
      ||
      !this.canAddNewKnowledgeTag
    ) {

      return;

    }


    this.knowledgeSelectedTags
      .push(
        value
      );


    this.addTagToAvailableList(
      value
    );


    this.knowledgeTagSearch =
      '';

    this.knowledgeTagDropdownOpen =
      false;

  }


  // =========================================================
  // REMOVE Q&A TAG
  // =========================================================

  removeKnowledgeTag(
    tag: string
  ):
    void {

    this.knowledgeSelectedTags =
      this.knowledgeSelectedTags
        .filter(
          value =>
            value !== tag
        );

  }


  // =========================================================
  // CREATE Q&A
  // =========================================================

  openKnowledgeCreate():
    void {

    this.editingKnowledge =
      null;


    this.knowledgeForm = {

      title: '',

      content: '',

      priority: 0,

      active: true

    };


    this.knowledgeSelectedTags =
      [];


    this.knowledgeTagSearch =
      '';

    this.knowledgeTagDropdownOpen =
      false;


    this.errorMessage = '';

    this.successMessage = '';


    this.knowledgeModalOpen =
      true;

  }


  // =========================================================
  // EDIT Q&A
  // =========================================================

  openKnowledgeEdit(
    item: any
  ):
    void {

    this.editingKnowledge =
      item;


    this.knowledgeForm = {

      title:
        item?.title
        || '',

      content:
        item?.content
        || '',

      priority:
        Number(
          item?.priority
          || 0
        ),

      active:
        item?.active
        !== false

    };


    this.knowledgeSelectedTags =
      Array.isArray(
        item?.keywords
      )
        ? [
            ...item.keywords
          ]
        : [];


    this.knowledgeTagSearch =
      '';

    this.knowledgeTagDropdownOpen =
      false;


    this.errorMessage = '';

    this.successMessage = '';


    this.knowledgeModalOpen =
      true;

  }


  // =========================================================
  // CLOSE Q&A
  // =========================================================

  closeKnowledgeModal():
    void {

    if (this.saving) {

      return;

    }


    this.knowledgeModalOpen =
      false;

    this.editingKnowledge =
      null;

    this.knowledgeSelectedTags =
      [];

    this.knowledgeTagSearch =
      '';

    this.knowledgeTagDropdownOpen =
      false;

  }


  // =========================================================
  // SAVE Q&A
  // =========================================================

  async saveKnowledge():
    Promise<void> {

    if (this.saving) {

      return;

    }


    const question =
      this.knowledgeForm.title
        .trim();


    const answer =
      this.knowledgeForm.content
        .trim();


    if (!question) {

      this.errorMessage =
        'Question is required.';

      return;

    }


    if (!answer) {

      this.errorMessage =
        'Answer is required.';

      return;

    }


    if (
      this.knowledgeSelectedTags
        .length === 0
    ) {

      this.errorMessage =
        'Please select at least one tag.';

      return;

    }


    const payload = {

      title:
        question,

  category:
    'faq',

      content:
        answer,

      keywords: [
        ...this.knowledgeSelectedTags
      ],

      priority:
        Number(
          this.knowledgeForm.priority
          || 0
        ),

      active:
        this.knowledgeForm.active

    };


    this.saving = true;

    this.errorMessage = '';

    this.successMessage = '';


    try {

      if (
        this.editingKnowledge
      ) {

        await this.knowledgeService
          .updateKnowledge(
            this.editingKnowledge.id,
            payload
          );


        this.successMessage =
          'Q&A updated successfully.';

      } else {

        await this.knowledgeService
          .createKnowledge({

            ...payload,

            place_id:
              this.placeId

          });


        this.successMessage =
          'Q&A added successfully.';

      }


      this.knowledgeModalOpen =
        false;

      this.knowledgeSelectedTags =
        [];

      this.knowledgeTagSearch =
        '';


      await this.loadPage();


    } catch (error) {

      console.error(
        'Save Q&A error:',
        error
      );


      this.errorMessage =
        'Unable to save Q&A.';

    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // TOGGLE Q&A
  // =========================================================

  async toggleKnowledge(
    item: any
  ):
    Promise<void> {

    if (!item?.id) {

      return;

    }


    this.errorMessage = '';

    this.successMessage = '';


    try {

      await this.knowledgeService
        .toggleKnowledge(
          item.id,
          !item.active
        );


      this.successMessage =
        item.active
          ? 'Q&A deactivated.'
          : 'Q&A activated.';


      await this.loadPage();


    } catch (error) {

      console.error(
        'Toggle Q&A error:',
        error
      );


      this.errorMessage =
        'Unable to change Q&A status.';

    }

  }


  // =========================================================
  // DELETE Q&A
  // =========================================================

  async deleteKnowledge(
    item: any
  ):
    Promise<void> {

    if (
      !item?.id
      ||
      this.deleting
    ) {

      return;

    }


    const confirmed =
      window.confirm(
        `Delete "${item.title}"?`
      );


    if (!confirmed) {

      return;

    }


    this.deleting = true;

    this.errorMessage = '';

    this.successMessage = '';


    try {

      await this.knowledgeService
        .deleteKnowledge(
          item.id
        );


      this.successMessage =
        'Q&A deleted successfully.';


      await this.loadPage();


    } catch (error) {

      console.error(
        'Delete Q&A error:',
        error
      );


      this.errorMessage =
        'Unable to delete Q&A.';

    } finally {

      this.deleting = false;

      this.cdr.markForCheck();

    }

  }

}