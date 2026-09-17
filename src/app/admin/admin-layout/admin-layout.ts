import {
  Component
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterOutlet,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  LucideAngularModule,
  LayoutDashboard,
  MessagesSquare,
  CalendarCheck,
  MapPinned,
  ScrollText,
  ExternalLink,
  BookOpenText,
  UsersRound,
  UserRoundCheck,
  ChartNoAxesCombined,
  Users
} from 'lucide-angular';


@Component({

  selector:
    'app-admin-layout',

  standalone:
    true,

  imports: [

    CommonModule,

    RouterOutlet,

    RouterLink,

    RouterLinkActive,

    LucideAngularModule

  ],

  templateUrl:
    './admin-layout.html',

  styleUrl:
    './admin-layout.css'

})

export class AdminLayoutComponent {

  readonly LayoutDashboard =
    LayoutDashboard;

  readonly MessagesSquare =
    MessagesSquare;

  readonly CalendarCheck =
    CalendarCheck;

  readonly MapPinned =
    MapPinned;

  readonly ScrollText =
    ScrollText;

  readonly ExternalLink =
    ExternalLink;

  readonly BookOpenText =
    BookOpenText;

  readonly UsersRound =
    UsersRound;

  readonly UserRoundCheck =
    UserRoundCheck;

  readonly ChartNoAxesCombined =
    ChartNoAxesCombined;

  readonly Users =
    Users;

}