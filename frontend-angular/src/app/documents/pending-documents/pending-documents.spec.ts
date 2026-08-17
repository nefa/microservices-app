import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PendingDocuments } from './pending-documents';

describe('PendingDocuments', () => {
  let component: PendingDocuments;
  let fixture: ComponentFixture<PendingDocuments>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PendingDocuments],
    }).compileComponents();

    fixture = TestBed.createComponent(PendingDocuments);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
