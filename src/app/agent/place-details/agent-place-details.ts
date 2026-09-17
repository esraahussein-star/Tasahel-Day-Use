import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  ActivatedRoute,
  Router
} from '@angular/router';

import {
  LucideAngularModule,
  ArrowRight,
  MapPin,
  WalletCards,
  ShieldCheck,
  BookOpen,
  CircleHelp,
  CheckCircle2,
  BadgeDollarSign,
  Building2,
  Clock3,
  Users,
  Sparkles,
  Info,
  CalendarDays
} from 'lucide-angular';

import {
  AgentWorkspaceService
} from '../services/agent-workspace.service';


type PlaceTab =
  | 'overview'
  | 'pricing'
  | 'policies'
  | 'guide'
  | 'faq';


@Component({
  selector: 'app-agent-place-details',

  standalone: true,

  imports: [
    CommonModule,
    LucideAngularModule
  ],

  templateUrl: './agent-place-details.html',

  styleUrl: './agent-place-details.css'
})
export class AgentPlaceDetailsComponent
implements OnInit {

  // =========================================================
  // DATA
  // =========================================================

  place: any = null;

  knowledge: any[] = [];


  // =========================================================
  // STATE
  // =========================================================

  loading = true;

  errorMessage = '';

  activeTab:
    PlaceTab =
      'overview';


  // =========================================================
  // FAQ
  // =========================================================

  openFaqId:
    string | null =
      null;


  // =========================================================
  // ICONS
  // =========================================================

  readonly ArrowRight =
    ArrowRight;

  readonly MapPin =
    MapPin;

  readonly WalletCards =
    WalletCards;

  readonly ShieldCheck =
    ShieldCheck;

  readonly BookOpen =
    BookOpen;

  readonly CircleHelp =
    CircleHelp;

  readonly CheckCircle2 =
    CheckCircle2;

  readonly BadgeDollarSign =
    BadgeDollarSign;

  readonly Building2 =
    Building2;

  readonly Clock3 =
    Clock3;

  readonly Users =
    Users;

  readonly Sparkles =
    Sparkles;

  readonly Info =
    Info;

  readonly CalendarDays =
    CalendarDays;


  constructor(
    private route:
      ActivatedRoute,

    private router:
      Router,

    private workspaceService:
      AgentWorkspaceService,

    private cdr:
      ChangeDetectorRef
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  async ngOnInit():
    Promise<void> {

    const placeId =
      this.route.snapshot
        .paramMap
        .get('id');


    if (!placeId) {

      this.errorMessage =
        'المكان غير محدد.';

      this.loading = false;

      return;

    }


    await this.loadPlace(
      placeId
    );

  }


  // =========================================================
  // LOAD PLACE
  // =========================================================

  async loadPlace(
    placeId: string
  ):
    Promise<void> {

    this.loading = true;

    this.errorMessage = '';

    this.cdr.markForCheck();


    try {

      const [
        place,
        knowledge
      ] =
        await Promise.all([

          this.workspaceService
            .getPlaceById(
              placeId
            ),

          this.workspaceService
            .getPlaceKnowledge(
              placeId
            )

        ]);


      if (!place) {

        throw new Error(
          'PLACE_NOT_FOUND'
        );

      }


      this.place =
        place;


      this.knowledge =
        Array.isArray(knowledge)
          ? knowledge
          : [];


    } catch (error) {

      console.error(
        'Place details loading error:',
        error
      );


      this.errorMessage =
        'تعذر تحميل ملف المكان.';


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // NAVIGATION
  // =========================================================

  goBack():
    void {

    this.router.navigate([
      '/agent/places'
    ]);

  }


  setTab(
    tab: PlaceTab
  ):
    void {

    this.activeTab =
      tab;

  }


  // =========================================================
  // RAW COLLECTIONS
  // =========================================================

  get services():
    any[] {

    return this.normalizeCollection(
      this.place?.services
    );

  }


  get packages():
    any[] {

    return this.normalizeCollection(
      this.place?.packages
    );

  }


  get extras():
    any[] {

    return this.normalizeCollection(
      this.place?.extras
    );

  }


  // =========================================================
  // OVERVIEW KNOWLEDGE
  // =========================================================

  get overviewKnowledge():
    any[] {

    return this.knowledge.filter(
      item => {

        const category =
          this.normalizeText(
            item?.category
          );


        if (
          category === 'service'
        ) {

          return true;

        }


        if (
          category !== 'general'
        ) {

          return false;

        }


        return !this.isAgentGuideItem(
          item
        );

      }
    );

  }


  // =========================================================
  // POLICY KNOWLEDGE
  // =========================================================

  get policyKnowledge():
    any[] {

    return this.knowledge.filter(
      item =>
        this.normalizeText(
          item?.category
        ) === 'policy'
    );

  }


  // =========================================================
  // BOOKING KNOWLEDGE
  // =========================================================

  get bookingKnowledge():
    any[] {

    return this.knowledge.filter(
      item =>
        this.normalizeText(
          item?.category
        ) === 'booking'
        &&
        !this.isAgentGuideItem(
          item
        )
    );

  }


  // =========================================================
  // PAYMENT KNOWLEDGE
  // =========================================================

  get paymentKnowledge():
    any[] {

    return this.knowledge.filter(
      item =>
        this.normalizeText(
          item?.category
        ) === 'payment'
    );

  }


  // =========================================================
  // AGENT GUIDE
  // =========================================================

  get guideKnowledge():
    any[] {

    return this.knowledge.filter(
      item =>
        this.isAgentGuideItem(
          item
        )
    );

  }


  // =========================================================
  // FAQ
  // =========================================================

  get faqKnowledge():
    any[] {

    return this.knowledge.filter(
      item =>
        this.normalizeText(
          item?.category
        ) === 'faq'
    );

  }


  // =========================================================
  // AGENT GUIDE DETECTION
  // =========================================================

  private isAgentGuideItem(
    item: any
  ):
    boolean {

    const keywords =
      this.getKeywords(
        item
      );


    const title =
      this.normalizeText(
        item?.title
      );


    const guideKeywords =
      [
        'agent_guide',
        'agent',
        'checklist',
        'important',
        'agent notes',
        'script',
        'questions',
        'follow up',
        'waiting place',
        'no answer'
      ];


    const hasGuideKeyword =
      guideKeywords.some(
        keyword =>
          keywords.includes(
            keyword
          )
      );


    const guideTitleWords =
      [
        'موظف',
        'المكالمة',
        'تأكيد الحجز',
        'المكان لم يرد',
        'العميل لم يرد',
        'شرح السعر'
      ];


    const hasGuideTitle =
      guideTitleWords.some(
        word =>
          title.includes(
            this.normalizeText(
              word
            )
          )
      );


    return (
      hasGuideKeyword
      ||
      hasGuideTitle
    );

  }


  // =========================================================
  // KEYWORDS
  // =========================================================

  private getKeywords(
    item: any
  ):
    string[] {

    if (
      !Array.isArray(
        item?.keywords
      )
    ) {

      return [];

    }


    return item.keywords
      .map(
        (keyword: any) =>
          this.normalizeText(
            keyword
          )
      )
      .filter(Boolean);

  }


  // =========================================================
  // JSON NORMALIZER
  // =========================================================

  private normalizeCollection(
    value: any
  ):
    any[] {

    if (!value) {

      return [];

    }


    if (
      Array.isArray(value)
    ) {

      return value;

    }


    if (
      typeof value === 'object'
    ) {

      return Object.entries(
        value
      )
        .map(
          ([key, item]) => {

            if (
              item
              &&
              typeof item ===
                'object'
            ) {

              return {
                key,
                ...(item as any)
              };

            }


            return {
              key,
              value: item
            };

          }
        );

    }


    return [];

  }


  // =========================================================
  // ITEM DISPLAY
  // =========================================================

  getItemTitle(
    item: any
  ):
    string {

    return String(
      item?.name
      ||
      item?.title
      ||
      item?.label
      ||
      item?.package
      ||
      item?.service
      ||
      item?.extra
      ||
      item?.key
      ||
      'عنصر'
    );

  }


  getItemDescription(
    item: any
  ):
    string {

    return String(
      item?.description
      ||
      item?.details
      ||
      item?.content
      ||
      item?.note
      ||
      item?.value
      ||
      ''
    );

  }


  getItemPrice(
    item: any
  ):
    number | null {

    const value =
      item?.price
      ??
      item?.amount
      ??
      item?.cost
      ??
      item?.total
      ??
      null;


    if (
      value === null
      ||
      value === undefined
      ||
      value === ''
    ) {

      return null;

    }


    const parsed =
      Number(value);


    return Number.isFinite(
      parsed
    )
      ? parsed
      : null;

  }


  // =========================================================
  // PACKAGE GUESTS
  // =========================================================

  getPackageGuests(
    item: any
  ):
    string {

    const adults =
      item?.adults;

    const children =
      item?.children
      ??
      item?.kids;

    const guests =
      item?.guests
      ??
      item?.capacity;


    if (
      adults !== undefined
      ||
      children !== undefined
    ) {

      const parts:
        string[] = [];


      if (
        adults !== undefined
      ) {

        parts.push(
          `${adults} بالغ`
        );

      }


      if (
        children !== undefined
        &&
        Number(children) > 0
      ) {

        parts.push(
          `${children} طفل`
        );

      }


      return parts.join(
        ' + '
      );

    }


    if (
      guests !== undefined
    ) {

      return `${guests} فرد`;

    }


    return '';

  }


  // =========================================================
  // PACKAGE TIME
  // =========================================================

  getPackageTime(
    item: any
  ):
    string {

    const from =
      item?.from
      ??
      item?.start_time
      ??
      item?.check_in
      ??
      item?.checkin;

    const to =
      item?.to
      ??
      item?.end_time
      ??
      item?.check_out
      ??
      item?.checkout;


    if (
      from &&
      to
    ) {

      return `${from} - ${to}`;

    }


    return String(
      item?.time
      ||
      item?.hours
      ||
      ''
    );

  }


  // =========================================================
  // BASE PRICE
  // =========================================================

  get basePrice():
    number | null {

    const value =
      Number(
        this.place?.price
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
  // TAGS
  // =========================================================

  get tags():
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
        (item: any) =>
          String(item)
      );

  }


  // =========================================================
  // FAQ
  // =========================================================

  toggleFaq(
    id: string
  ):
    void {

    if (
      this.openFaqId === id
    ) {

      this.openFaqId =
        null;

      return;

    }


    this.openFaqId =
      id;

  }


  isFaqOpen(
    id: string
  ):
    boolean {

    return (
      this.openFaqId === id
    );

  }


  // =========================================================
  // CATEGORY LABEL
  // =========================================================

  getCategoryLabel(
    category:
      string |
      null |
      undefined
  ):
    string {

    const labels:
      Record<string, string> = {

        general:
          'معلومات عامة',

        service:
          'الخدمات والمرافق',

        policy:
          'السياسات',

        booking:
          'الحجز',

        payment:
          'الدفع',

        faq:
          'الأسئلة الشائعة'

      };


    const key =
      this.normalizeText(
        category
      );


    return (
      labels[key]
      ||
      category
      ||
      'معلومات'
    );

  }


  // =========================================================
  // LAST UPDATE
  // =========================================================

  get lastUpdatedAt():
    string | null {

    const values =
      [
        this.place?.updated_at,

        ...this.knowledge.map(
          item =>
            item?.updated_at
        )
      ]
        .filter(Boolean)
        .map(
          value =>
            new Date(
              value
            )
        )
        .filter(
          date =>
            !Number.isNaN(
              date.getTime()
            )
        )
        .sort(
          (
            a,
            b
          ) =>
            b.getTime()
            -
            a.getTime()
        );


    if (
      values.length === 0
    ) {

      return null;

    }


    return values[0]
      .toISOString();

  }


  // =========================================================
  // CONTENT FLAGS
  // =========================================================

  get hasOverviewContent():
    boolean {

    return (
      !!this.place?.description
      ||
      this.services.length > 0
      ||
      this.overviewKnowledge.length > 0
    );

  }


  get hasPricingContent():
    boolean {

    return (
      this.packages.length > 0
      ||
      this.extras.length > 0
      ||
      !!this.basePrice
    );

  }


  get hasPoliciesContent():
    boolean {

    return (
      this.policyKnowledge.length > 0
      ||
      this.bookingKnowledge.length > 0
      ||
      this.paymentKnowledge.length > 0
    );

  }


  get hasGuideContent():
    boolean {

    return (
      this.guideKnowledge.length > 0
    );

  }


  get hasFaqContent():
    boolean {

    return (
      this.faqKnowledge.length > 0
    );

  }


  // =========================================================
  // COUNTS FOR TABS
  // =========================================================

  get pricingCount():
    number {

    return (
      this.packages.length
      +
      this.extras.length
    );

  }


  get policiesCount():
    number {

    return (
      this.policyKnowledge.length
      +
      this.bookingKnowledge.length
      +
      this.paymentKnowledge.length
    );

  }


  get guideCount():
    number {

    return this.guideKnowledge.length;

  }


  get faqCount():
    number {

    return this.faqKnowledge.length;

  }


  // =========================================================
  // TEXT NORMALIZER
  // =========================================================

  private normalizeText(
    value: any
  ):
    string {

    return String(
      value || ''
    )
      .trim()
      .toLowerCase();

  }


  // =========================================================
  // TRACK BY
  // =========================================================

  trackByKnowledgeId(
    index: number,
    item: any
  ):
    string | number {

    return (
      item?.id
      ||
      index
    );

  }


  trackByIndex(
    index: number
  ):
    number {

    return index;

  }

}