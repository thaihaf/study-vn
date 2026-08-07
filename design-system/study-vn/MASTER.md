# Lộ Trình Việt — Master Design System

Status: active baseline  
Style direction: **Accessible Soft Minimal**  
Product family: Vietnamese-first online learning / structured roadmap / admin authoring

Tài liệu này tổng hợp product contract hiện tại với các nguyên tắc ưu tiên của UI/UX Pro Max. Recommendation “Educational App / Online Course” được điều chỉnh để phù hợp long study sessions: bớt playful/clay, giữ hierarchy rõ, màu ấm, motion thấp và density theo từng surface.

## 1. Design principles

1. **Readability trước decoration.** Learner phải đọc 20–60 phút mà không mệt vì chrome, gradient hoặc animation thừa.
2. **One primary action per region.** Secondary action dùng surface/outline style; destructive action tách rõ.
3. **Progress without pressure.** Hiển thị tiến độ, weak topics, due review; tránh streak/FOMO/manipulative urgency.
4. **Warm and calm.** Neutral hơi ấm + deep green/teal. Orange chỉ dùng achievement/action accent nhỏ.
5. **Accessible by default.** Visible focus, semantic HTML, label rõ, status không chỉ dựa màu, reduced motion.
6. **Admin can be dense, learner cannot be noisy.** Density là page concern, không phải đổi brand.
7. **No raw visual magic numbers in components.** Common colors/radius/shadow/spacing đi qua token/class.

## 2. Semantic color tokens

### Light

| Token | Value | Purpose |
|---|---|---|
| `--background` | `#FBFAF7` | warm app background |
| `--surface` | `#FFFFFF` | cards/forms |
| `--surface-subtle` | `#F3F7F4` | grouped/inset areas |
| `--foreground` | `#17201C` | primary text |
| `--foreground-muted` | `#66736C` | secondary text |
| `--primary` | `#176B52` | brand, primary button |
| `--primary-hover` | `#125741` | hover/pressed |
| `--primary-foreground` | `#FFFFFF` | text on primary |
| `--progress` | `#0F766E` | progress/learning state |
| `--accent` | `#C2410C` | achievement/attention |
| `--accent-foreground` | `#FFFFFF` | text on accent |
| `--success` | `#16794A` | successful state |
| `--warning` | `#A15C08` | warning |
| `--danger` | `#B42318` | destructive/error |
| `--info` | `#2563EB` | informational state |
| `--border` | `#DDE4DF` | normal divider |
| `--border-strong` | `#B9C7BF` | emphasized border |
| `--focus-ring` | `#176B52` | keyboard focus |

### Dark

Dark mode không dùng pure black. Surface có độ tách nhẹ, text không pure white để giảm glare.

| Token | Value |
|---|---|
| `--background` | `#0F1512` |
| `--surface` | `#18201C` |
| `--surface-subtle` | `#202A25` |
| `--foreground` | `#EDF4EF` |
| `--foreground-muted` | `#AAB7B0` |
| `--primary` | `#75D2AD` |
| `--primary-hover` | `#95DFC0` |
| `--primary-foreground` | `#0D1A14` |
| `--progress` | `#5EEAD4` |
| `--accent` | `#FDBA74` |
| `--accent-foreground` | `#3B1605` |
| `--success` | `#6EE7A8` |
| `--warning` | `#F6C66A` |
| `--danger` | `#FF8C82` |
| `--info` | `#93C5FD` |
| `--border` | `#344039` |
| `--border-strong` | `#53635A` |
| `--focus-ring` | `#75D2AD` |

## 3. Typography

Không tải font bên ngoài chỉ để đổi “vibe”. Baseline dùng native system sans cho tốc độ và Vietnamese glyph ổn định.

- Body: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Code: `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`.
- Base size: 16px.
- Body line-height: 1.6.
- Reading prose: 1.75–1.85; max width khoảng 70–75ch.
- Heading line-height: 1.1–1.25.
- Không dùng body text < 14px cho nội dung chính; metadata có thể 13–14px khi contrast đủ.

Suggested scale:

- `--text-xs`: 0.8125rem
- `--text-sm`: 0.875rem
- `--text-base`: 1rem
- `--text-lg`: 1.125rem
- `--text-xl`: 1.25rem
- `--text-2xl`: 1.5rem
- `--text-3xl`: 2rem
- `--text-display`: `clamp(2.25rem, 6vw, 4.75rem)`

## 4. Spacing / radius / elevation

Base spacing rhythm 4px, UI thường dùng 8/12/16/24/32/48.

- `--space-1` 0.25rem
- `--space-2` 0.5rem
- `--space-3` 0.75rem
- `--space-4` 1rem
- `--space-6` 1.5rem
- `--space-8` 2rem
- `--space-12` 3rem
- `--space-16` 4rem

Radius:

- small control: 0.5rem
- input/button: 0.65–0.75rem
- card: 1rem
- pill/badge: 999px

Elevation:

- Default card: border only or very small shadow.
- Hovered interactive card: stronger border + subtle shadow/translate <= 1px.
- Không stack nhiều shadow/glow.

## 5. Interaction rules

- Normal clickable target: min-height/min-width ~44px khi layout cho phép.
- Compact admin toolbar action có thể nhỏ hơn nhưng MUST có accessible name và spacing đủ để không bấm nhầm.
- Hover transition 150–220ms; press feedback nhanh hơn hover.
- `:focus-visible` luôn rõ, không remove outline mà không thay thế.
- Disabled control giảm opacity nhưng text vẫn đọc được; cursor/aria state nhất quán.
- Loading action phải đổi label hoặc show progress; không để click “im lặng”.
- Destructive action phải có confirm khi mất dữ liệu/không undo được.

## 6. Motion

Default motion intensity thấp (2/10 learner, 3/10 marketing/admin).

Allowed:

- color/border/background transition;
- subtle opacity/translate for small feedback;
- skeleton shimmer nhẹ nếu không gây distraction.

Avoid:

- parallax cho lesson reader;
- continuous floating/pulsing CTA;
- layout animation làm nội dung nhảy;
- width/height animation lớn gây layout thrash.

`prefers-reduced-motion: reduce` phải tắt non-essential animation/transition.

## 7. Layout / breakpoints

Targets:

- 360–639: mobile single-column.
- 640–899: large mobile/tablet.
- 900–1199: tablet/small desktop; lesson có thể 2 cột.
- 1200+: desktop/wide; lesson 3 vùng khi đủ không gian.

Container:

- marketing/general max ~1120–1200px;
- reading content max ~75ch;
- admin may use larger width/dense table, nhưng horizontal scroll chỉ ở table/data region.

## 8. Component guidance

### Button

Variants: primary, secondary, ghost, danger. Icon-only button MUST có `aria-label`/tooltip. Không dùng emoji làm UI icon; dùng Lucide hoặc text khi icon không cần thiết.

### Card

Card không phải default cho mọi thứ. Dùng khi cần group semantic. Interactive card phải có hover/focus state rõ và whole-card link không chứa nested interactive controls.

### Input

Visible label, helper/error text ở gần field. Error dùng color + text/icon, không chỉ đỏ viền. `aria-invalid` khi invalid ở client-side controlled form.

### Status badge

Ngắn, không dùng màu làm thông tin duy nhất. Ví dụ `IN_REVIEW` nên có text “Chờ duyệt”.

### Table

Header semantic, row actions dễ tìm, mobile cho phép region scroll hoặc transform thành list khi data ít.

### Skeleton/empty/error

Mọi data-heavy page cần empty state có next action. Loading skeleton reserve layout để giảm CLS. Error state nói người dùng làm gì tiếp theo, technical detail chỉ ở admin/debug context.

## 9. Content-specific rules

### Learner

- Reading surface tối giản.
- Navigation course có hierarchy module → lesson rõ.
- Notes/bookmark không che nội dung.
- Prev/next controls luôn reachable nhưng không overlay content trên mobile.
- Progress feedback trung tính, không tạo áp lực.

### Assessment

- Câu hỏi và choices có spacing lớn, label clickable toàn vùng.
- Timer (nếu có) không nhấp nháy liên tục.
- Correct/incorrect result phải có text/symbol + color.
- Answer key không render trước submit.

### Admin / Builder

- Density cao hơn learner, nhưng group module/lesson/block bằng whitespace/border trước khi dùng background mạnh.
- Sticky toolbar chỉ chứa current context + primary actions.
- Autosave state luôn nhìn thấy: saved/saving/error.
- Drag handle có keyboard alternative/reorder action khi feasible.
- Destructive actions không cạnh primary action nếu dễ misclick.

## 10. Pre-delivery checklist

- [ ] 360px không horizontal-scroll ngoài data region có chủ đích.
- [ ] Keyboard có thể reach mọi control quan trọng.
- [ ] Focus-visible rõ trên link/button/input/select/textarea.
- [ ] Normal touch target khoảng 44px.
- [ ] Body text >= 16px ở lesson/prose.
- [ ] Contrast của text/action chính đạt WCAG AA.
- [ ] Status không chỉ dựa màu.
- [ ] Reduced motion được tôn trọng.
- [ ] Loading/empty/error/success feedback có ý nghĩa.
- [ ] Không raw hex mới trong feature component nếu đã có semantic token.
- [ ] Axe core surfaces không có serious/critical violation.
- [ ] Không copy pixel layout/asset/branding từ product/reference repo khác.
