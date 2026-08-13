import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageBubble } from './message-bubble';

describe('MessageBubble', () => {
  let component: MessageBubble;
  let fixture: ComponentFixture<MessageBubble>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageBubble],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageBubble);
    fixture.componentRef.setInput('message', { id: '1', role: 'user', text: 'hello' });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
