NHỮNG VIỆC CẦN SỬA
I.	Về PPT
1.	Bỏ lý do chọn đề tài
2.	Phạm vi nên ghi rõ ra: ví dụ các chức năng nào (ngắn thôi), hoặc không đụng đến sinh viên nước ngoài, không có phân chia hạng phòng
3.	Phân phòng : Note thêm vài ý lớn trên ppt dạng khi đăng ký thì sinh viên chọn phòng chọn giường sao.
4.	Bỏ quy tắc nghiệp vụ chính 
5.	 sau kiến trúc hệ thống nói thêm về phần ci/cd deploy lên đâu, github k, triển khai sao
6.	thiếu testting, Performance Testing không hay test cái gì
7.	Kết quả thực hiện không cần quá nhiều màn hình , tóm tắt kết quả
8.	Nêu hướng mở rộng
9.	sau này chọn ảnh gửi đơn đăng ký lấy mấy ảnh giống giống k được lấy ảnh bậy
II.	Về giao diện, code
Vấn đề chung chung:
-	Đổi tên email admin ngắn lại
-	Làm sao để biết sinh viên đó tốt nghiệp chưa để duyệt đơn đăng ký . ( Tú đang suy nghĩ là lưu trong bảng student cột Tình trạng học tập ) nếu như nhập MSSV của sinh viên đó mà thấy tạm ngừng học, thôi học, đình chỉ học, đã tốt nghiệp chuyển trường thì không được đăng ký tài khoản để đăng ký nội trú nhưng đó chỉ là dành cho sinh viên mới, còn sinh viên cũ nếu đang ở mà rơi vào trạng thái đó thì xem ở ảnh sau và hỏi chat kĩ hơn). Bin cũng có thể làm hướng khác nếu thấy hay hơn
 
 
-	Nếu sinh viên rời khỏi ký túc xá thì lưu sao : tính chu kỳ hay sao, mấy người không ở nữa thì xóa hay khóa thông tin hay sao , còn mấy người ở tiếp thì sao
-	Có hạn đăng ký, sau khi hết hạn đăng ký thì mới tự động duyệt hết đơn , xong tự động phân phòng
-	Nên hiện hình dạng trực quan hóa ( để sau đi )
10.	Quy trình đăng ký: 
-	Đang bị dư cái chọn phòng, chủ yếu nói về làm như thế nào để duyệt đăng ký, các tiêu chí đăng ký, list ra dạng danh sách những tiêu chí nào có thể đăng ký được, những quy trình này đang làm bằng tay, em đang muốn thay đổi lại thành duyệt tự động. Liệt kê những tiêu chí những tiêu chí nào duyệt tự động những tiêu chí nào phải duyệt bằng tay
-	Tính các trường hợp đặc biệt khi đăng ký: con liệt sĩ, con đẻ của những người hoạt động kháng chiến, dân tộc thiểu số, khó khăn, khuyết tật, tham gia các hoạt động công tác xã hội ( để đi hỏi ktx sau là free hay giảm bao nhiêu phần trăm ). làm table chứ không được hardcode
-	Nếu ktx nhiều người đăng ký không đủ sẽ ưu tiên cho những trường hợp đặc biệt đó, vô đki chốt thời hạn , đăng ký trước thời hạn xong sau đó khóa lại duyệt 1 lần, xem tổng số đơn đăng ký rồi duyệt tự động l lần
-	Chưa rõ nghiệp vụ:
•	Sinh viên đăng ký đầu năm thì quy trình sao 
•	Sinh viên đăng ký đột xuất mà không phải vào đầu năm thì quy trình sao
•	Sinh viên cũ quy trình đăng ký có giống sinh viên mới hay không, hằng năm duyệt lại hay sao có cho nó ở tiếp không, sinh viên cũ có được đăng ký ở tiếp không, nếu không thì phải làm sao . Sinh viên cũ phải có những tiêu chí nào để được ở tiếp còn sinh viên mới sẽ có những tiêu chí nào để duyệt.
•	Nếu sinh viên ra trường rồi thì không cho ở
•	Sinh viên tới hạn ra trường nhưng vẫn chưa ra thì sao
-	Nếu như sinh viên ở hết thời gian đăng ký và muốn ở tiếp thì phải làm sao để tự động reset lại, tự set vô trạng thái đăng ký lại , nếu có muốn đăng ký thì đăng ký không thì thôi , nhưng nếu có thì kh phải gửi đơn như từ đầu mà vẫn ở phòng đó tiếp, giường đó tiếp
-	Admin sẽ có thông báo cho tất cả sinh viên sắp hết hạn ở là cần đăng ký lại nếu muốn ở tiếp, nhưng thường sinh viên từ năm 3 lên 4 sẽ k cho nó ở nữa 
11.	Quy trình phân phòng 
-	Xếp phòng hệ thống tự động không duyệt từng sinh viên nhưng phải có quy tắc
-	Phải có quy tắc để xếp tổng quát trước: ví dụ ưu tiên mấy đứa cùng tỉnh cho chung phòng rồi đến gì đó sao đó, xong mới đến thứ tự gửi đơn.
-	Sau khi duyệt tự động thì phải xuất ra 1 danh sách sinh viên mà nó tự động duyệt cho admin duyệt tổng quát lại 1 lần, nếu oke hết thì ấn Xác nhận, còn cái nào k oke hay có 1 vài sinh viên muốn sinh phòng nào đó thì admin duyệt tay
-	Sau khi sinh viên chọn giường xong admin có thể xem danh sách , có thể duyệt lại hay không đều được, nhưng nếu có là phải tự động
-	Sinh viên có thể đổi giường, có thể thông báo cho admin sửa hoặc sau khi chọn đổi giường thì phải cập nhật trạng thái giường đó trống hay sao đó. cái nào tốt hơn thì làm, tại lỡ phòng đang full mà 2 bạn mún đổi giường với nhau thì cần việc cập nhật trống khi ấn đổi giường thì 2 bạn đó mới chọn giường của nhau được(xóa stutus)
-	Còn nếu sinh viên cũ thì có được ở tiếp phòng giường cũ đó hay không (thường là sẽ cho ở tiếp chỗ cũ không đổi nên bỏ qua quy trình chọn giường, phòng (thầy muốn vậy)).
-	Phải cho sinh viên xin đổi giường, đổi phòng ( đưa ra những tiêu chí hoặc tình huống cố định nào đó , nếu muốn đổi phòng, giường mà có rơi vào trường hợp đó thì được đổi kèm theo giới hạn chứ không được đổi hoài)
-	Admin được đổi phòng cho sinh viên nếu phòng có bị hư hay mất điện gì đó ( dời đi như dời lại ). Có thể phân xong sao cho sinh viên chọn có đồng ý ở cái giường admin phân không
-	// phần này bỏ cũng đượcCó những tình huống đặc biệt, tạm không ở 1 thời gian vì lí do đặc biệt . Ví dụ như trường phân cho đi hội thảo cho trường thì nên được free tháng đó hay sao vì đó là lý do đặc biệt, và lưu cái trạng thái giường đó thành 1 status khác hay sao //
-	Trong lúc quản lý sinh viên trong phòng đó admin có thể coi được chi tiêt được sinh viên trong phòng đó có vi phạm gì không, có đang nợ không, kiểu phải xem tất tần tật về nó luôn, để ảnh luôn càng tốt
-	Phải có chức năng dời sinh viên qua phòng khác, nhưng vẫn ghi lại thông tin cũ để sửa chữa xong dời nó lại
12.	Quản lý thanh toán
-	Nên làm theo tháng hay quý hay năm. Rồi nếu sinh viên vô giữa tháng đóng sao, đang mới ở được giữa tháng mà đi thì sao. // bỏ cũng được Rồi cái trường hợp đặc biệt nó đi cho trường thì miễn phí sao, lưu sao, thu rồi trả hay khấn qua tháng sau sao //
-	Các trường hợp đặc biệt xét ưu tiên như con liệt sĩ, con đẻ của những người hoạt động kháng chiến, dân tộc thiểu số, khó khăn, khuyết tật, tham gia các hoạt động công tác xã hội thì sẽ được miễn phí hay giảm giá hay sao
13.	Vấn đề sinh viên đóng trễ tiền phòng thì thường sẽ nhắc nhở trước (gửi mail thông báo nhắc nhở) sau 3 tháng không đóng thì cho thôi ở. Nhắc nhở làm tự động nếu như sinh viên trễ đóng tiền trong bao lâu thì tự động hệ thống sinh mail gửi mail thông báo cho nó. ( 7 ngày chưa đóng thông báo nhắc nhở, 1 tháng k đóng thông báo tiếp, 3 tháng không đóng thông báo nhắc kèm cảnh cáo không đóng sẽ cho thôi ở trong vòng 7 ngày nữa) và sẽ lưu nó trong danh sách không bao giờ được ở tiếp. Phải có 1 danh sách sinh viên nợ học phí ( sau khi nó đóng rồi thì mới cho nó ra khỏi danh sách )
14.	Quản lý vi phạm ( nên đổi tên và đổi mục đích , vì có tốt có xấu )
-	Quản lý hoạt động

NGHIỆP VỤ ỨNG DỤNG QUẢN LÝ KÝ TÚC XÁ ĐẠI HỌC STU
I. QUY TRÌNH ĐĂNG KÝ NỘI TRÚ (CHỈ PHẦN ĐƠN ĐĂNG KÝ — CHƯA TÍNH PHÂN PHÒNG)
Phạm vi: dành cho sinh viên chưa ở KTX (sinh viên mới, hoặc từng ở nhưng hiện không còn lưu trú). Sinh viên đang ở muốn ở tiếp → quy trình Gia hạn riêng. Quy trình này kết thúc khi đơn được chính thức duyệt — phân phòng, chọn giường là quy trình kế tiếp.
Hai kênh đăng ký (dùng chung một bộ tiêu chí duyệt):
•	Kênh đợt chính: mở đầu năm học, nhận đơn theo đợt, hết hạn đợt máy duyệt theo lô một lần.
•	Kênh quanh năm: hoạt động ngoài thời gian đợt chính, máy duyệt tức thì từng đơn để tận dụng giường trống.
Sinh viên không cần phân biệt 2 kênh — chỉ có một nút "Đăng ký nội trú", hệ thống tự hiển thị đúng form/thông báo theo kênh nào đang mở.
Nguyên tắc về đơn: mỗi sinh viên chỉ có một đơn đang hiệu lực tại một thời điểm. Đơn đã gửi là chốt: không sửa, không hủy. Hồ sơ không hợp lệ (ảnh mờ, giấy tờ sai) sẽ bị từ chối — không có bổ sung. Chỉ khi đơn bị từ chối mới được gửi đơn mới.
________________________________________
Bước 0 — Tạo tài khoản (tách khỏi điều kiện ở)
•	Tài khoản chỉ là định danh đăng nhập, không phải quyền được ở. Điều kiện duy nhất: MSSV tồn tại trong dữ liệu sinh viên của trường.
•	Trạng thái một chiều không đảo ngược (đã tốt nghiệp, chuyển trường) → từ chối tạo tài khoản.
•	Trạng thái có thể thay đổi (nợ, năm 4, tạm ngừng, đình chỉ) → vẫn cho tạo, vì sinh viên cần đăng nhập để trả nợ, xem hóa đơn. Việc chặn để cửa đăng ký lo.
Bước 1 — Admin mở đợt đăng ký chính & trạng thái kênh quanh năm
•	Admin tạo đợt: tên đợt, năm học/học kỳ, thời gian nhận đơn (từ ngày – đến ngày), thời hạn lưu trú dự kiến. Công bố trên trang chủ + gửi thông báo/email đến sinh viên.
•	Mỗi năm một đợt chính đầu năm học; ngoài đợt chính, sinh viên nộp qua kênh quanh năm khi kênh mở.
•	Từ lúc đợt chính mở nhận đơn đến khi phân phòng xong, kênh quanh năm tự khóa — chống "lách hàng" (nộp lẻ để được duyệt tức thì, chiếm giường trước cả trăm người đang chờ xếp hạng trong đợt).
•	Sau khi đợt chính phân phòng xong, kênh quanh năm mở với số giường trống còn lại, và tự chuyển 4 trạng thái:
Trạng thái kênh quanh năm	Khi nào	Sinh viên thấy gì
ĐÓNG — đợt chính đang hoạt động	Từ lúc đợt mở nhận đơn → phân phòng xong	Chỉ thấy form đợt chính (trong hạn) hoặc "Đang xử lý đợt đăng ký, vui lòng quay lại sau"
MỞ — duyệt tức thì	Còn ≥1 giường trống đúng giới tính, chưa gần cuối năm học	Form đăng ký, nộp xong máy duyệt ngay
TẠM ĐÓNG — hết giường	Hết giường trống đúng giới tính	"KTX đã đầy" + nút vào danh sách chờ; có giường giải phóng → hệ thống mail theo thứ tự → mở lại
ĐÓNG — gần hết năm học	Còn dưới ngưỡng tối thiểu (ví dụ 1 tháng, cấu hình settings) tới ngày kết thúc kỳ ở	"Vui lòng chờ đợt đăng ký năm học mới"
•	Kèm công tắc tay: admin bật/tắt kênh quanh năm bất cứ lúc nào (sửa chữa tòa nhà, tình huống đặc biệt) — không cần sửa code.
Bước 2 — Kiểm tra điều kiện TRƯỚC KHI hiện form
Sinh viên bấm "Đăng ký nội trú" → hệ thống kiểm tra ngay, không đạt thì không hiện form, thay bằng thông báo lý do:
Tình huống	Hiển thị thay cho form
Đã có đơn đang hiệu lực (Đã nộp)	Trang trạng thái đơn: chỉ xem chi tiết, không sửa, không hủy — "Đơn của bạn đã được ghi nhận, kết quả sẽ thông báo sau"
Đang có lưu trú hiệu lực	"Bạn đang ở phòng X, muốn ở tiếp dùng chức năng Gia hạn" + nút dẫn sang
Không kênh nào đang mở	Thông báo theo trạng thái ở Bước 1: "Đang xử lý đợt..." / "KTX đã đầy + danh sách chờ" / "Chờ đợt năm học mới"
Không trong tình trạng đang học	"Bạn không trong tình trạng đang học"
Thuộc blacklist	"Bạn thuộc danh sách không được đăng ký ở KTX"
Sinh viên năm cuối	"Sinh viên năm cuối không thuộc diện được ở KTX"
Còn nợ cũ chưa trả	"Bạn còn hóa đơn chưa thanh toán" + nút dẫn sang thanh toán. Trả xong quay lại là form mở (miễn kênh còn mở)
Lưu ý: các điều kiện thay đổi được (nợ, năm cuối, tình trạng học tập) qua được Bước 2 vẫn được kiểm tra lại ở Bước 4 trên dữ liệu mới nhất — vì trạng thái có thể đổi giữa lúc nộp và lúc chốt đợt.
Bước 3 — Điền và gửi đơn 
Form gồm các nhóm thông tin (theo đúng Phiếu đăng ký lưu trú của trường): 
o	Thông tin cá nhân: họ tên, ngày sinh, giới tính, ảnh 3x4, MSSV, lớp, ngành học, khóa, quốc tịch, dân tộc, tôn giáo, số CCCD, ngày cấp, nơi cấp CCCD, SĐT, địa chỉ thường trú, nơi ở hiện tại trước khi vào lưu trú (các trường in đậm là bổ sung cho khớp form giấy — phần lớn đã có sẵn trong dữ liệu sinh viên, hệ thống tự điền, sinh viên rà lại).
o	Thông tin người thân: họ tên cha + năm sinh + nghề nghiệp + SĐT; họ tên mẹ + năm sinh + nghề nghiệp + SĐT; địa chỉ liên hệ cha/mẹ.
o	Ảnh CCCD 2 mặt.
o	Khai tiêu chí ưu tiên (đánh dấu các diện phù hợp, theo danh sách ở Mục II) + đính kèm minh chứng.
o	Tick cam kết chấp hành nội quy KTX (số hóa Bản cam kết của trường).
•	Validate theo thời gian thực từng ô: CCCD 12 số, SĐT đúng định dạng, đủ ảnh, đủ trường bắt buộc — sai đâu báo đỏ ngay đó.
•	Vì gửi là chốt, bắt buộc có màn hình xem lại toàn bộ thông tin trước khi gửi + cảnh báo rõ: "Đơn sau khi gửi sẽ KHÔNG thể chỉnh sửa hoặc hủy. Vui lòng kiểm tra kỹ." → tick xác nhận đã kiểm tra → bấm Gửi.
•	Chặn trùng 2 lớp: backend kiểm tra "đã có đơn chưa" trước khi ghi + ràng buộc UNIQUE (sinh viên, đơn đang hiệu lực) ở database.
•	Gửi thành công → đơn trạng thái Đã nộp, khóa hoàn toàn.
•	Phát hiện sai sót sau khi gửi → liên hệ Ban quản lý; admin từ chối đơn (lý do "sinh viên báo sai thông tin") → sinh viên được gửi đơn mới nếu kênh còn mở.
Bước 4 — Hệ thống chạy duyệt tự động (kết quả là ĐỀ XUẤT, chưa chính thức)
Bộ tiêu chí chung cho cả 2 kênh, kiểm tra trên dữ liệu mới nhất, gắn nhãn đề xuất:
•	Đề xuất TỪ CHỐI (kèm lý do tự sinh): không đang học / blacklist / còn nợ / năm cuối / hồ sơ không hợp lệ — ảnh CCCD mờ không đọc được, thông tin không khớp, giấy tờ mờ (kể cả minh chứng ưu tiên). Hồ sơ không hợp lệ là từ chối thẳng, không bổ sung; muốn nộp lại thì gửi đơn mới ở kênh quanh năm khi còn giường.
•	Chờ DUYỆT TAY (chỉ còn 2 ca cần con người): (1) khai tiêu chí ưu tiên mới chưa xác minh → admin xác minh minh chứng; (2) lịch sử thanh toán xấu kỳ ở trước (sạch nợ nhưng từng trễ ≥3 lần hoặc từng bị cảnh cáo nợ) → admin quyết, có thể kèm điều kiện đóng trước cả quý/học kỳ.
•	Đề xuất DUYỆT: qua hết tiêu chí và còn chỗ.
Khác nhau duy nhất giữa 2 kênh — thời điểm chạy và cách tính "còn chỗ":
•	Kênh đợt chính: hết hạn nhận đơn → đợt khóa → máy chạy một lần cho toàn bộ đơn. "Còn chỗ" = thứ hạng đơn nằm trong tổng giường trống của đợt; số đơn vượt số chỗ → xếp hạng theo điểm ưu tiên (đã xác minh) giảm dần → thời điểm nộp tăng dần; phần vượt → đề xuất từ chối "Hết chỗ" hoặc vào danh sách chờ.
•	Kênh quanh năm: máy chạy tức thì ngay khi đơn được nộp. "Còn chỗ" = còn ≥1 giường trống đúng giới tính — không có xếp hạng vì đơn không tranh chỗ với ai.
Ở bước này chưa gửi gì cho sinh viên — tất cả là kết quả máy chạy, chờ admin chốt.
Bước 5 — Admin rà soát và XÁC NHẬN — đơn mới chính thức được duyệt
•	Kênh đợt chính: hệ thống hiển thị bảng tổng hợp 3 nhóm: Đề xuất duyệt / Chờ duyệt tay / Đề xuất từ chối (kèm lý do từng đơn), mỗi dòng xem được chi tiết hồ sơ. Kênh quanh năm: từng đơn hiện lên màn hình chờ xác nhận ngay khi máy chạy xong.
•	Admin có toàn quyền đổi quyết định từng đơn trước khi chốt: 
o	Máy đề xuất duyệt nhưng có trường hợp đặc biệt → admin bấm Từ chối kèm lý do nhập tay.
o	Máy đề xuất từ chối nhưng admin xét ngoại lệ → bấm Duyệt, hệ thống ghi "duyệt thủ công bởi admin + lý do" để truy vết.
o	Nhóm chờ duyệt tay → admin xác minh minh chứng ưu tiên / xét lịch sử thanh toán → Duyệt hoặc Từ chối từng đơn. (Hồ sơ mờ đã nằm ở nhóm Đề xuất từ chối, admin chỉ việc xác nhận.)
•	Xử lý xong → admin bấm Xác nhận (cả đợt với kênh chính, từng đơn với kênh quanh năm) → đơn chuyển trạng thái chính thức: Đã duyệt / Từ chối (kèm lý do).
•	Chỉ sau cú bấm này hệ thống mới gửi thông báo + email kết quả cho sinh viên.
Sau khi có kết quả
•	Đã duyệt → chờ quy trình phân phòng (quy trình kế tiếp).
•	Từ chối → sinh viên xem được lý do, và chỉ từ lúc này mới được gửi đơn mới: trong đợt sau, hoặc qua kênh quanh năm khi kênh đang mở. Đơn bị từ chối không khóa quyền đăng ký về sau (trừ khi lý do từ chối là blacklist).
________________________________________
Vòng đời một đơn: Đã nộp (khóa hoàn toàn: không sửa, không hủy) → (máy chạy — theo lô ở đợt chính / tức thì ở kênh quanh năm) Đề xuất duyệt / Chờ duyệt tay / Đề xuất từ chối → (admin Xác nhận) Đã duyệt / Từ chối (chỉ Từ chối mới mở quyền gửi đơn mới).
II. TIÊU CHÍ ƯU TIÊN DUYỆT ĐƠN ⭐ (THÊM MỚI — lấy đúng theo Phiếu đăng ký của trường)
Sinh viên tự khai khi đăng ký (đánh dấu các diện phù hợp, có thể thuộc nhiều diện) và đính kèm minh chứng. Admin xác minh; chỉ diện đã xác minh (VERIFIED) mới được tính điểm ưu tiên và miễn giảm. Cách xếp hạng theo BẬC ƯU TIÊN, không cộng điểm trộn lẫn giữa các diện: xét bậc cao nhất trước (bậc 1 cao nhất), cùng bậc mới so tổng điểm các diện đã xác minh, cùng điểm thì ai nộp đơn trước được trước. Miễn giảm tiền phòng áp theo mức cao nhất trong các diện đã xác minh.
Mã	Tiêu chí (theo form trường)	Bậc	Điểm (đề xuất)
UT01	Con liệt sĩ, con thương binh, bệnh binh	1	100
UT02	Con của người hoạt động kháng chiến bị nhiễm chất độc hóa học	1	90
UT03	Sinh viên khuyết tật / mồ côi cả cha lẫn mẹ không nơi nương tựa	2	85
UT04	Sinh viên người dân tộc thiểu số	2	80
UT05	Hộ khẩu & sinh sống tại xã khó khăn / hộ nghèo, cận nghèo	2	75
UT06	Tham gia hoạt động công tác xã hội (cán bộ đoàn, hội, khác)	3	30

Quy tắc tính & xếp hạng ưu tiên (cơ chế phân tầng):
•	Bậc (tier) là chìa khóa chính: bậc 1 cao nhất (diện chính sách: con liệt sĩ, con người có công), bậc 2 (hoàn cảnh: khuyết tật, dân tộc, hộ nghèo), bậc 3 (khuyến khích: công tác xã hội). Ai có diện ở bậc cao hơn được ưu tiên trước, BẤT KỂ tổng điểm.
•	Điểm chỉ phân hạng TRONG CÙNG bậc: hai người cùng bậc cao nhất thì cộng tổng điểm các diện đã xác minh, ai cao hơn thắng; bằng nhau thì ai nộp đơn trước thắng. Điểm không được phép vượt bậc.
•	Ví dụ: A chỉ thuộc diện con người có công (bậc 1, 100đ) xếp TRÊN B vừa dân tộc thiểu số vừa có thành tích (bậc cao nhất của B là bậc 2, tổng 110đ) — A thắng vì bậc 1 cao hơn bậc 2, dù điểm thấp hơn.
•	Người không thuộc diện ưu tiên nào: coi như bậc thấp nhất, điểm 0 — xếp sau tất cả người có ưu tiên, chỉ hơn nhau bằng giờ nộp đơn.
III. QUY TRÌNH PHÂN PHÒNG & CHỌN GIƯỜNG
Nguyên tắc: hệ thống xếp phòng tự động theo quy tắc (không duyệt từng sinh viên), xuất danh sách đề xuất cho admin rà soát tổng quát, xác nhận một lần (sửa tay vài ca đặc biệt), sau đó sinh viên chọn giường. Quy trình này chạy ngay sau khi đơn được duyệt ở Mục I.
1. Phân phòng cho ĐỢT CHÍNH (xếp theo lô)
Bước 1 — Hệ thống xếp phòng tự động (theo thứ tự quy tắc). Áp dụng tuần tự cho toàn bộ sinh viên đã được duyệt:
•	(1) Lọc cứng: chỉ xét phòng đúng giới tính với tầng (nam tầng 1, nữ tầng 2), phòng và giường không bảo trì, còn giường trống. Đây là điều kiện bắt buộc, không phải ưu tiên.
•	(2) Điểm ưu tiên cao xếp trước: sinh viên diện ưu tiên đã xác minh được xếp trước; nếu KTX quy định vị trí thuận lợi (tầng thấp/giường dưới cho sinh viên khuyết tật) thì áp dụng ở bước này.
•	(3) Gom nhóm cùng tỉnh/thành: nhóm sinh viên theo quê quán, xếp cả nhóm vào cùng phòng; nhóm đông xếp trước, nhóm vượt sức chứa thì tách sang phòng kề bên cùng tầng.
•	(4) Cùng khoa, rồi cùng khóa: phần còn lại không gom đủ theo tỉnh thì ưu tiên ghép cùng khoa, sau đó cùng năm học.
•	(5) Thứ tự nộp đơn: tiêu chí phân hạng cuối cùng khi mọi yếu tố trên ngang nhau — ai nộp trước xếp trước.
•	(6) Lấp đầy từng phòng: lấp đầy lần lượt từng phòng thay vì rải đều — giảm phòng lẻ người, tiết kiệm điện, dễ quản lý.
Bước 2 — Admin rà soát & xác nhận danh sách phân phòng. 
•	Hệ thống xuất danh sách phân phòng đề xuất: MSSV, họ tên, tỉnh, khoa, khóa, điểm ưu tiên, phòng được đề xuất — gom theo phòng để admin nhìn tổng quát.
•	Mọi thứ ổn → bấm Xác nhận tất cả một lần. Có ca cần chỉnh (sinh viên muốn vào phòng cụ thể, hoặc admin thấy cần đổi) → sửa tay từng trường hợp rồi mới xác nhận.
•	Sau xác nhận, gửi thông báo + email “Bạn được phân vào phòng X” cho sinh viên.
Bước 3 — Sinh viên chọn giường. 
•	Sinh viên xem sơ đồ giường của phòng được phân: trống / đã chiếm / bảo trì, chọn 1 giường trống, ai chọn trước được trước.
•	Hệ thống cập nhật trạng thái giường theo cơ chế nguyên tử (chống 2 người chiếm cùng giường — giường vừa bị lấy thì báo lỗi, chọn lại).
•	Thời hạn chọn giường (mặc định 3 ngày, cấu hình settings): quá hạn không chọn → lưu trú bị HỦY (CANCELLED), giường về trống; sinh viên phải đăng ký lại.
•	Chọn xong → giường chuyển OCCUPIED, occupancy.status = ACTIVE.
Bước 4 — Admin xem lại sau khi chọn giường (không bắt buộc). Admin xem danh sách giường đã chọn theo từng phòng để nắm tình hình; hệ thống mặc định tự ghi nhận, admin không cần duyệt lại từng giường. Trường hợp cần đổi giường cho ca đặc biệt được xử lý theo Mục III (Đổi phòng/giường).
Bước 5 — Sinh viên cũ gia hạn (bỏ qua phân phòng & chọn giường). Sinh viên được duyệt gia hạn giữ nguyên phòng và giường cũ, hệ thống tạo lưu trú kỳ mới sao chép phòng/giường từ kỳ trước, vào thẳng ACTIVE — bỏ qua Bước 1–3. Chỗ của sinh viên gia hạn được khóa trước khi xếp phòng cho sinh viên mới (tránh bị đè).
2. Phân phòng cho ĐĂNG KÝ ĐỘT XUẤT (kênh quanh năm)
Nguyên tắc: giống hệt đợt chính — máy tự duyệt và tự xếp phòng, xuất danh sách cho admin xác nhận một lần, admin chỉ duyệt tay khi có ca đặc biệt. Khác đợt chính duy nhất ở chỗ: không gom nhóm theo lô (vì vào lẻ), máy xếp từng đơn vào phòng phù hợp nhất trong số phòng đang còn chỗ.
Bước 1 — Máy tự duyệt + tự xếp phòng: đơn quanh năm nộp lúc nào máy duyệt tức thì lúc đó (Mục I), rồi tự xếp luôn vào phòng phù hợp nhất theo quy tắc rút gọn: đúng giới tính + không bảo trì + còn giường → ưu tiên phòng có người cùng tỉnh → cùng khoa → cùng khóa → phòng đang lấp dở. Kết quả → occupancy.status = PROPOSED, chờ admin xác nhận.
Bước 2 — Admin xác nhận (một lần, vẫn duyệt tay được): các đơn đã xếp phòng hiện lên danh sách chờ admin xác nhận (gom các đơn đang ở trạng thái PROPOSED, xử lý khi rảnh — không phải mở từng cái). Mọi thứ ổn → bấm Xác nhận → ROOM_CONFIRMED, gửi thông báo. Ca cần duyệt tay (sinh viên xin phòng cụ thể, admin muốn đổi phòng đề xuất, phòng sắp sửa chữa) → sửa phòng rồi mới xác nhận.
Bước 3 — Sinh viên chọn giường: giống hệt đợt chính (xem sơ đồ giường → chọn giường trống, cơ chế nguyên tử → quá hạn không chọn → lưu trú bị HỦY (CANCELLED), giường về trống; sinh viên phải đăng ký lại qua kênh quanh năm).
Bước 4 — Tiền phòng tháng đầu: vào ở giữa tháng → hóa đơn tháng đầu tính theo số ngày thực ở (prorate), không tính trọn tháng.

3. Bảo trì phòng — dời toàn bộ sinh viên & giữ nguyên danh sách
Nguyên tắc: khi một phòng cần bảo trì (hư hỏng, sửa chữa...), admin dời toàn bộ sinh viên đang ở phòng đó sang những phòng mà còn giường trống tạm thời. Danh sách gắn kết sinh viên–giường của phòng gốc KHÔNG bị xóa — bảo trì xong, hệ thống gán lại đúng người cũ về đúng phòng và giường gốc.
Bước 1 — Admin đánh dấu phòng bảo trì:
•	Admin mở màn hình quản lý phòng → chọn phòng cần bảo trì → bấm Chuyển sang bảo trì.
•	Hệ thống đổi rooms.status = MAINTENANCE và hiển thị danh sách sinh viên đang ở phòng đó (MSSV, họ tên, giường hiện tại).
Bước 2 — Admin chọn phòng đích và hệ thống dời:
•	Admin chọn phòng đích (phòng trống hoặc còn đủ chỗ, đúng giới tính) để tiếp nhận toàn bộ sinh viên.
•	Hệ thống tự động: (1) tạo bản ghi room_change_log cho từng sinh viên với is_temporary = true, lưu old_room_id và old_bed_id (phòng/giường gốc); (2) cập nhật occupancy sang phòng đích; (3) gán giường tạm theo thứ tự giường trống trong phòng đích.
•	Sinh viên nhận thông báo + email: “Phòng của bạn đang bảo trì, bạn được chuyển tạm sang phòng X giường Y. Bảo trì xong sẽ trả về chỗ cũ.”
•	Trong thời gian tạm trú, sinh viên vẫn được tính tiền phòng và tiền điện bình thường.
Bước 3 — Bảo trì hoàn tất, gán lại về chỗ cũ:
•	Admin mở phòng gốc → bấm Hoàn tất bảo trì → rooms.status về AVAILABLE.
•	Hệ thống tra cứu danh sách room_change_log có is_temporary = true của phòng này → tự động đưa từng sinh viên về đúng old_room_id + old_bed_id ban đầu.
•	Cập nhật log: thêm bản ghi dời về (chiều ngược lại), đánh dấu is_temporary = false (hoàn tất chu kỳ dời tạm).
•	Sinh viên nhận thông báo: “Phòng đã bảo trì xong, bạn đã được trả về phòng X giường Y.”
Lưu ý: Trong thời gian phòng bảo trì, không có sinh viên mới nào được xếp vào phòng đó (rooms.status = MAINTENANCE bị lọc khỏi danh sách phòng khi phân phòng). Giường ở phòng đích chỉ là tạm thời — khi sinh viên về chỗ cũ, giường đó lại về trạng thái trống.
IV. QUY TRÌNH GIA HẠN LƯU TRÚ
Phạm vi: dành cho sinh viên đang lưu trú muốn ở tiếp kỳ tiếp. Khác với quy trình đăng ký (dành cho người chưa ở), sinh viên chỉ cần bấm một nút xác nhận, không điền lại form, không nộp lại giấy tờ (hồ sơ đã có sẵn trong hệ thống). Được duyệt thì giữ nguyên phòng và giường cũ, bỏ qua hoàn toàn bước phân phòng và chọn giường.
Bước 1 — Hệ thống nhắc nhở trước 1 tháng
•	Trước ngày hết hạn lưu trú 1 tháng, hệ thống tự động gửi thông báo + email cho sinh viên: “Lưu trú của bạn sẽ hết hạn ngày dd/mm/yyyy. Nếu muốn ở tiếp, vui lòng gia hạn trước ngày [hạn chốt]. Quá hạn không gia hạn sẽ mất phòng.”
•	Hạn chốt gia hạn: sinh viên phải bấm gia hạn trong vòng 1 tháng trước ngày hết hạn (cấu hình được trong settings). Quá hạn chốt mà không gia hạn → hết hạn lưu trú, giường được giải phóng, muốn ở lại phải đăng ký mới qua Quy trình I.
•	Hệ thống nhắc thêm 1 lần nữa vào 1 tuần trước hạn chốt nếu sinh viên chưa gia hạn.
Bước 2 — Sinh viên kiểm tra điều kiện và bấm gia hạn
Sinh viên vào trang “Gia hạn lưu trú” — hệ thống kiểm tra điều kiện ngay tại thời điểm bấm (không phải điền form), hiển thị rõ từng điều kiện đạt / chưa đạt:
•	Đang học (academic_status = STUDYING).
•	Không còn nợ hóa đơn tiền phòng hoặc tiền điện (không có UNPAID/OVERDUE).
•	Không vi phạm nghiêm trọng trong kỳ hiện tại; vi phạm trung bình không quá 1 lần.
•	Chưa lên năm cuối (course_year + 1 ≤ max_course_year_allowed).
Đạt tất cả 4 điều kiện → hiển thị nút Bấm Gia hạn kèm thông tin: phòng hiện tại, giường, kỳ gia hạn, thời hạn lưu trú mới.
Không đạt bất kỳ điều kiện nào → hiển thị lý do tương ứng:
•	Nợ hóa đơn → “Vui lòng thanh toán đủ công nợ trước khi gia hạn” + nút dẫn sang trang thanh toán. Trả xong quay lại bấm gia hạn được ngay (nếu chưa quá hạn chốt).
•	Không đang học hoặc lên năm cuối → từ chối gia hạn, hết hạn phải trả phòng.
•	Vi phạm trung bình > 1 lần → chuyển admin xem xét (xem Bước 3 nhánh B).
Bước 3 — Xử lý yêu cầu gia hạn
Phân 2 nhánh:
Nhánh A — Tự động duyệt (đạt cả 4 điều kiện):
•	Hệ thống tạo occupancy mới cho kỳ tiếp, sao chép room_id và bed_id từ kỳ cũ (giữ nguyên phòng và giường), vào thẳng trạng thái ACTIVE — bỏ qua hoàn toàn bước phân phòng và chọn giường.
•	Giường cũ vẫn OCCUPIED, không giải phóng, không cho người khác xếp vào.
•	Sinh viên nhận thông báo + email: “Gia hạn thành công. Bạn tiếp tục ở phòng X giường Y, từ ngày [ngày bắt đầu kỳ mới] đến ngày [ngày kết thúc kỳ mới].”
•	Hóa đơn tiền phòng kỳ mới tạo tự động vào ngày 1 của tháng đầu tiên kỳ mới, tính đầy đủ theo tháng (không prorate vì ở liên tục).
Nhánh B — Chuyển admin xem xét (vi phạm trung bình > 1 lần):
•	Thông báo cho sinh viên: “Yêu cầu gia hạn của bạn đang được xem xét, vui lòng chờ kết quả.”
•	Admin xem lịch sử vi phạm, quyết định Duyệt hoặc Từ chối kèm lý do.
•	Duyệt → chạy giống Nhánh A. Từ chối → sinh viên nhận thông báo, hết hạn phải trả phòng.
Bước 4 — Không gia hạn / Gia hạn thất bại
•	Sinh viên không bấm gia hạn trong hạn cho phép, hoặc bị từ chối → hết hạn lưu trú → occupancy.status = COMPLETED, giường về EMPTY.
•	Muốn ở lại phải nộp đơn đăng ký mới qua Quy trình I (mất ưu tiên giữ phòng cũ).
•	Giường được giải phóng cho đợt đăng ký tiếp theo 
Vòng đời gia hạn: Hệ thống nhắc 1 tháng trước hết hạn → sinh viên kiểm tra điều kiện → Đạt đủ (Nhánh A): tự động duyệt, giữ phòng/giường cũ, vào thẳng ACTIVE / Vi phạm > 1 lần (Nhánh B): chuyển admin xem xét → Không gia hạn / bị từ chối: occupancy = COMPLETED, giường về EMPTY, muốn ở lại phải đăng ký mới.

V. QUY TRÌNH THANH TOÁN & XỬ LÝ NỢ
Phạm vi: áp dụng cho sinh viên đang lưu trú. Có 2 loại hóa đơn: tiền phòng (theo tháng) và tiền điện (theo tháng, theo chỉ số công tơ phòng). Mọi đơn giá, hạn nộp, mốc nhắc nợ đều lưu trong cấu hình hệ thống.
1. Tiền phòng — thu theo THÁNG
•	Chu kỳ: hệ thống tự tạo hóa đơn tiền phòng cho từng sinh viên vào ngày 1 hàng tháng, hạn nộp trong 7 ngày (cấu hình settings). Đơn giá mặc định 350.000đ/tháng.
•	Vào ở giữa tháng (prorate): tháng đầu tính theo số ngày thực ở. Công thức: tiền tháng đầu = đơn giá tháng ÷ số ngày trong tháng × số ngày thực ở. Ví dụ vào ngày 16/9, tháng 9 có 30 ngày → đóng 15/30 tháng. 
•	Đi giữa tháng (tự ý thôi ở): không hoàn tiền tháng đó — sinh viên chủ động thôi ở, KTX đã giữ chỗ. Trường hợp bị buộc thôi ở vì nợ cũng không hoàn.
•	Sinh viên gia hạn: tiếp tục thu theo tháng bình thường trên kỳ lưu trú mới, không gián đoạn.
2. Tiền điện — theo chỉ số công tơ phòng
•	Mỗi tháng admin nhập chỉ số điện cũ và mới của từng phòng → hệ thống tính số kWh tiêu thụ × đơn giá (mặc định 2.500đ/kWh) ra tổng tiền điện phòng.
•	Chia cho sinh viên trong phòng theo số ngày thực ở: tiền điện mỗi người = tổng tiền điện phòng ÷ tổng số ngày-người trong tháng × số ngày người đó ở. Ai ở nhiều ngày hơn trả nhiều hơn — công bằng với người vào/ra giữa tháng. 
•	Chỉ số mới tháng này tự thành chỉ số cũ tháng sau (ràng buộc chỉ số mới ≥ chỉ số cũ để chặn nhập sai).
3. Thanh toán
•	Sinh viên xem hóa đơn (tiền phòng + tiền điện) và lịch sử thanh toán trong tài khoản.
•	Hình thức: chuyển khoản / ví điện tử (VNPay) 
•	Thanh toán thành công → hóa đơn tương ứng chuyển trạng thái Đã thanh toán (PAID). Mỗi hóa đơn có thể có giao dịch thất bại/thử lại, nên giao dịch thanh toán được lưu tách khỏi hóa đơn để đối soát.
4. Danh sách sinh viên đang nợ
•	Là danh sách động, không phải danh sách cố định: hệ thống tự truy vấn mọi hóa đơn đang ở trạng thái Chưa thanh toán (UNPAID) hoặc Quá hạn (OVERDUE) để ra danh sách sinh viên đang nợ.
•	Sinh viên đóng đủ → hóa đơn chuyển PAID → tự động ra khỏi danh sách nợ ngay, không cần admin thao tác.
•	Phân biệt rõ: danh sách nợ là tạm thời (đóng là hết); còn danh sách cấm ở (blacklist) là vĩnh viễn (xem mục 7).
5. Nhắc nợ tự động (3 mốc)
Khi hóa đơn quá hạn, hệ thống tự động sinh và gửi email nhắc nợ theo lịch ,kèm thông báo trên hệ thống. Mốc thời gian cấu hình trong settings:
Mốc	Thời điểm (kể từ ngày quá hạn)	Nội dung
Nhắc lần 1	Quá hạn 7 ngày	Email nhắc nhở: “Bạn còn hóa đơn chưa thanh toán, vui lòng đóng sớm.”
Nhắc lần 2	Quá hạn 1 tháng	Email nhắc lần 2, lời lẽ rõ hơn.
Cảnh cáo	Quá hạn 3 tháng	Email cảnh cáo: “Nếu không đóng trong 7 ngày tới sẽ bị buộc thôi ở KTX.” Bắt đầu đếm ngược 7 ngày.

•	Mỗi lần nhắc, hệ thống lưu lại: mốc nhắc (LEVEL_1/2/3), số tiền đang nợ tại thời điểm đó, thời điểm gửi — để truy vết.
•	Sinh viên đóng đủ bất kỳ lúc nào trong tiến trình này → dừng nhắc, ra khỏi danh sách nợ.
6. Buộc thôi ở & cấm ở vĩnh viễn
•	Sau cảnh cáo (mốc 3 tháng) mà quá 7 ngày vẫn không đóng → hệ thống/admin ra quyết định buộc thôi ở: chấm dứt lưu trú, giải phóng giường về trạng thái trống.
•	Đồng thời ghi sinh viên vào danh sách cấm ở với lý do “nợ quá hạn kéo dài”.
•	Trả nợ sau đó cũng KHÔNG được xóa khỏi blacklist — danh sách cấm là vĩnh viễn. Sinh viên đăng ký lại các kỳ sau sẽ bị từ chối tự động (đã quy định ở quy trình đăng ký).
•	Khoản nợ cũ vẫn còn nguyên nghĩa vụ phải trả; sinh viên vẫn đăng nhập được để thanh toán, nhưng không được ở lại.
7. Xử lý sinh viên có lịch sử thanh toán xấu (liên kết quy trình đăng ký)
•	Sinh viên chưa tới mức bị đuổi nhưng từng trễ hạn nhiều lần (mặc định ≥ 3 lần/kỳ) hoặc từng bị cảnh cáo nợ: khi đăng ký kỳ sau, đơn không bị từ chối thẳng nhưng chuyển admin duyệt tay, và admin có thể yêu cầu đóng trước cả quý/học kỳ thay vì theo tháng để giảm rủi ro.
•	Dữ liệu để xét lấy từ lịch sử hóa đơn OVERDUE và mức nhắc nợ cao nhất của sinh viên — không cần bảng riêng.
Vòng đời một hóa đơn: Tạo → đến hạn chưa đóng → Quá hạn → [nhắc 7 ngày → nhắc 1 tháng → cảnh cáo 3 tháng → buộc thôi ở + blacklist] hoặc Đóng đủ bất kỳ lúc nào → Đã thanh toán (ra khỏi danh sách nợ).
VI. QUY TRÌNH QUẢN LÝ HOẠT ĐỘNG (KHEN THƯỞNG & VI PHẠM)
Phạm vi: ghi nhận các hoạt động của sinh viên trong thời gian lưu trú — gồm cả hoạt động tốt (khen thưởng) và xấu (vi phạm) — để theo dõi, xử lý, và làm căn cứ cộng điểm ưu tiên cho đợt đăng ký sau. Toàn bộ do admin/BQL KTX ghi nhận, sinh viên không tự nhập.
Một bảng, hai loại: mọi ghi nhận lưu trong cùng một bảng hoạt động, phân biệt bằng phân loại (category): REWARD (tốt) hoặc VIOLATION (xấu). Danh mục loại hoạt động cấu hình được, không hardcode.
1. Danh mục loại hoạt động 
•	Admin quản lý danh mục các loại hoạt động, mỗi loại gồm: tên, phân loại (REWARD/VIOLATION), mức độ (chỉ áp cho vi phạm: nhẹ / trung bình / nghiêm trọng), mô tả.
•	Hoạt động tốt (REWARD): tham gia công tác xã hội, cán bộ đoàn/hội, hỗ trợ BQL KTX, giữ gìn vệ sinh tốt, đóng góp tích cực...
•	Hoạt động xấu (VIOLATION): gây mất trật tự, hút thuốc/uống rượu trong KTX, nấu ăn sai quy định, về trễ giờ, gây gổ, phá hoại tài sản... (mức độ tùy loại).
•	Loại đã được ghi nhận cho sinh viên thì không xóa, chỉ sửa tên hoặc vô hiệu hóa (để bảo toàn lịch sử).
2. Ghi nhận hoạt động
•	Admin chọn sinh viên → chọn loại hoạt động → nhập ngày, ghi chú, đính kèm minh chứng nếu có → lưu.
•	Hệ thống ghi rõ ai ghi nhận (admin nào) và thời điểm để truy vết.
•	Ghi nhận gắn với kỳ lưu trú của sinh viên, hiển thị trong hồ sơ sinh viên và màn hình quản lý phòng (admin xem tất tần tật về sinh viên).
3. Xử lý hoạt động XẤU (vi phạm) theo mức độ
Mức độ	Hướng xử lý
Nhẹ (MINOR)	Ghi nhận, nhắc nhở. Không ảnh hưởng lưu trú.
Trung bình (MODERATE)	Ghi nhận + cảnh cáo. Tích lũy nhiều lần là căn cứ để admin cân nhắc khi sinh viên đăng ký/gia hạn kỳ sau (chuyển duyệt tay).
Nghiêm trọng (SERIOUS)	Admin quyết định từng ca: tùy tính chất, có thể chỉ cảnh cáo nặng, hoặc buộc thôi ở. Nếu buộc thôi ở → chấm dứt lưu trú, giải phóng giường, ghi vào blacklist. Hệ thống không tự động đuổi — luôn cần admin ra quyết định và ghi lý do để truy vết.

•	Vi phạm (mọi mức) được lưu vĩnh viễn trong lịch sử, dùng tham khảo khi xét đăng ký/gia hạn kỳ sau.
4. Ghi nhận hoạt động TỐT (khen thưởng)
•	Hoạt động tốt được ghi nhận → cộng điểm ưu tiên cho đợt đăng ký sau (liên kết với tiêu chí ưu tiên UT06 — công tác xã hội ở Mục II).
•	Đây là cách hệ thống tự động hóa một phần việc xác minh ưu tiên: sinh viên làm cán bộ đoàn/hội, tham gia công tác xã hội đã được admin ghi nhận trong hệ thống → khi đăng ký kỳ sau, diện ưu tiên UT06 được máy tự xác minh từ dữ liệu hoạt động, không cần nộp lại giấy xác nhận của đoàn/hội.
5. Liên kết với các quy trình khác
•	Với đăng ký: vi phạm nghiêm trọng dẫn tới blacklist → đăng ký kỳ sau bị từ chối tự động; vi phạm trung bình tích lũy → chuyển duyệt tay.
•	Với phân phòng: lịch sử hoạt động hiển thị trong màn hình quản lý sinh viên trong phòng, giúp admin nắm tình hình.
•	Với ưu tiên: hoạt động tốt → nguồn dữ liệu tự động cho diện ưu tiên UT06.
Vòng đời một ghi nhận hoạt động: Admin ghi nhận (chọn loại REWARD/VIOLATION, mức độ) → lưu vào lịch sử sinh viên → tùy loại: REWARD cộng điểm ưu tiên đợt sau / VIOLATION xử lý theo mức độ (nhẹ nhắc nhở, trung bình cảnh cáo + tích lũy, nghiêm trọng admin quyết định có thể buộc thôi ở + blacklist).

DATABASE — ỨNG DỤNG QUẢN LÝ KÝ TÚC XÁ ĐH STU
A. Cơ sở vật chất
1. buildings (Tòa nhà)
buildings(building_code, name, address, status)
2. floors (Tầng)
floors(id, building_code, floor_number, gender, status, created_at, updated_at)
•	gender: male / female — lọc phòng đúng giới tính khi phân phòng.
•	status: active / maintenance. UNIQUE(building_code, floor_number).
3. rooms (Phòng)
rooms(id, floor_id, room_number, capacity, price_per_month, status, created_at, updated_at)
•	price_per_month: đơn giá tháng (chốt thu theo tháng, mặc định 350.000đ — lấy từ settings). FULL hệ thống tự cập nhật.
4. beds (Giường)
beds(id, room_id, bed_number, position, status, created_at, updated_at)
•	status: active   / maintenance. UNIQUE(room_id, bed_number).
B. Sinh viên & tài khoản
5. students (Sinh viên)
students(id, student_code, full_name, date_of_birth, gender, class_name, faculty,   course_year, phone, email, cccd, cccd_issued_date, cccd_issued_place,   nationality, ethnicity, religion, permanent_address, province_code,   avatar, status, academic_status, current_year, created_at, updated_at)
•	academic_status: studying / temporary_leave / dropped_out / suspended / waiting_graduation / graduated / overtime_training / transferred — điều kiện chặn đăng ký & xét duyệt.
•	province_code: mã tỉnh/thành FK → provinces.code — phục vụ xếp phòng ưu tiên cùng tỉnh.
•	status: active / inactive (khóa/mở tài khoản hệ thống).
6. accounts (Tài khoản)
accounts(id, student_id NULL, username, password, role, is_active,   otp_code, otp_expire, created_at, updated_at)
•	username: cho admin đăng nhập (admin không có MSSV); student_id NULL khi role = admin.
•	is_active: khóa/mở tài khoản.
7. blacklist (Danh sách cấm ở)
blacklist(id, student_id, reason, source, created_by, created_at, updated_at)
•	source: overdue_payment / serious_violation / other.

8. provinces (Tỉnh/Thành phố)
provinces(code, name, region, is_active, created_at, updated_at)

•	region: Bắc Bộ / Trung Bộ / Tây Nguyên / Nam Bộ — dùng cho dropdown form đăng ký và gợi ý phòng.
C. Đăng ký & ưu tiên
9. registration_periods (Đợt đăng ký)
registration_periods(id, name, school_year, semester, channel, start_date,   end_date, bed_selection_days, status, created_at, updated_at)
•	channel: main (đợt chính đầu năm) / rolling (kênh quanh năm).
•	status: pending / active / closed / processing.
•	bed_selection_days: số ngày sinh viên được chọn giường sau khi phân phòng (mặc định 3 ngày — lấy từ settings).
10. registrations (Đơn đăng ký)
registrations(id, student_id, registration_period_id, registration_type,   school_year, semester, avatar_url, father_name, father_birth_year,   father_job, father_phone, mother_name, mother_birth_year, mother_job,   mother_phone, parent_address, stay_from_date, stay_to_date,   cccd_front_url, cccd_back_url, commitment_confirm, status,   auto_decision, note, rejection_reason, top_priority_tier,   total_priority_score, approved_at, created_at, updated_at)
•	status: submitted (đã nộp, chờ chốt đợt) / approved / rejected.
•	auto_decision: approve / reject / review — nhãn máy đề xuất sau khi chạy duyệt tự động; admin xem và bấm Xác nhận mới chốt chính thức.
•	registration_type: new / renewal / emergency.
•	top_priority_tier + total_priority_score: lưu kết quả tính ưu tiên (chỉ tính diện VERIFIED) để xếp hạng khi vượt chỗ: bậc nhỏ → điểm cao → giờ nộp sớm.
11. priority_criteria (Tiêu chí ưu tiên)
priority_criteria(id, code, name, description, priority_score, tier, is_active, created_at, updated_at)
•	tier: bậc ưu tiên — 1 (chính sách: con liệt sĩ, con người có công), 2 (hoàn cảnh: khuyết tật, dân tộc, hộ nghèo), 3 (khuyến khích: công tác xã hội). Bậc nhỏ hơn = ưu tiên cao hơn, không bị điểm vượt bậc.
•	

Mã	Diện ưu tiên	Bậc	Điểm (đề xuất)
UT01	Con liệt sĩ, thương binh, bệnh binh	1	100
UT02	Con người hoạt động kháng chiến nhiễm chất độc	1	90
UT03	Sinh viên khuyết tật / mồ côi cả cha lẫn mẹ	2	85
UT04	Sinh viên người dân tộc thiểu số	2	80
UT05	Hộ nghèo / cận nghèo / xã khó khăn	2	75
UT06	Tham gia công tác xã hội (đoàn/hội)	3	30

12. student_priority (Ưu tiên của sinh viên)
student_priority(id, student_id, priority_criteria_id, evidence_url,   status, verified_by, verified_at, created_at, updated_at)
•	status: pending / verified / rejected — chỉ verified mới được tính điểm & miễn giảm.

13. waitlist (Danh sách chờ)
waitlist(id, registration_id, student_id, gender, priority_tier,   priority_score, queue_position, source, registration_period_id,   status, notified_at, created_at, updated_at)
•	source: main (đợt chính hết chỗ) / rolling (kênh quanh năm hết giường).
•	status: waiting / notified / converted / expired.
•	
D. Lưu trú & phân phòng
14. occupancy (Lưu trú)
occupancy(id, registration_id, student_id, room_id, bed_id NULL,   check_in_date, check_out_date, status, bed_approval_status,   reason, previous_occupancy_id, created_at, updated_at)
•	status: PROPOSED → ROOM_CONFIRMED → ACTIVE → COMPLETED / TERMINATED / CANCELLED.
•	bed_approval_status: pending / approved / rejected — sinh viên xác nhận đồng ý với giường được gán (khi hệ thống/admin tự gán quá hạn). Cần làm rõ và đổi tên thành bed_confirmed_by_student cho đúng nghĩa.
•	previous_occupancy_id: liên kết kỳ gia hạn về kỳ trước (giữ phòng/giường cũ).
15. room_change_requests (Yêu cầu đổi phòng/giường)
room_change_requests(id, occupancy_id, student_id, change_type,   current_room_id, current_bed_id, desired_room_id, desired_bed_id,   swap_with_occupancy_id, reason, reason_type, status,   rejection_reason, approved_by, requested_at, approved_at, created_at, updated_at)
•	change_type: bed / room / swap (đổi chéo 2 sinh viên — hoán đổi nguyên tử trong 1 transaction, không giải phóng giường ra trạng thái trống giữa chừng).
•	reason_type: health / conflict / facility / other. Giới hạn số lần/kỳ lấy từ settings.
16. room_change_log (Lịch sử chuyển phòng)
room_change_log(id, occupancy_id, old_room_id, old_bed_id,   new_room_id, new_bed_id, transfer_reason, change_source,   is_temporary, expected_return_date, transferred_at, created_at)
•	change_source: student_request / admin.
•	is_temporary + expected_return_date: dời tạm khi phòng hư rồi dời lại — ghi 2 bản ghi log (đi và về), giữ thông tin phòng gốc.
17. checkout_requests (Yêu cầu thôi ở)
checkout_requests(id, occupancy_id, student_id, reason,   expected_leave_date, status, rejection_reason,   processed_by, processed_at, created_at, updated_at)
•	status: pending / approved / rejected.
•	
E. Tài chính
18. electricity_records (Chỉ số điện)
electricity_records(id, room_id, month_year, old_index, new_index,   usage_kwh, unit_price, total_amount, created_at, updated_at)
•	
19. electricity_bills (Hóa đơn điện)
electricity_bills(id, student_id, electricity_record_id, occupancy_id,   month_year, usage_kwh, unit_price, amount, days_stayed,   total_days, due_date, payment_method, transaction_code,   paid_at, status, created_at, updated_at)
•	days_stayed + total_days: chia tiền điện theo ngày thực ở — ai ở nhiều ngày trả nhiều hơn.
•	status: unpaid / paid / overdue.
20. room_fee_bills (Hóa đơn tiền phòng)
room_fee_bills(id, student_id, occupancy_id, month, year,   amount, days_stayed, total_days, due_date, payment_method,   transaction_code, paid_at, status, priority_criteria_id,   created_at, updated_at)

•	days_stayed + total_days: prorate khi vào/ra giữa tháng. Tự ý thôi ở không hoàn tiền.
•	priority_criteria_id: diện ưu tiên áp giảm giá cho hóa đơn này.
21. payment_reminders (Nhắc nợ tự động)
payment_reminders(id, bill_type, bill_id, student_id,   reminder_level, due_amount, sent_at, note, created_at, updated_at)
•	bill_type: room_fee / electricity.
•	reminder_level: 1 (7 ngày quá hạn — nhắc lần 1) / 2 (1 tháng — nhắc lần 2) / 3 (3 tháng — cảnh cáo: 7 ngày nữa không đóng → buộc thôi ở + blacklist).
•	due_amount: số tiền nợ tại thời điểm nhắc (để mail hiển thị đúng số).

Mốc	Thời điểm	Nội dung
LEVEL_1	Quá hạn 7 ngày	Email nhắc nhở lần 1
LEVEL_2	Quá hạn 1 tháng	Email nhắc lần 2, lời lẽ rõ hơn
LEVEL_3	Quá hạn 3 tháng	Cảnh cáo: 7 ngày nữa không đóng → buộc thôi ở + vào blacklist vĩnh viễn

F. Hoạt động (khen thưởng & vi phạm)
22. activity_types (Loại hoạt động)
activity_types(id, name, level, description, category,   points, created_at, updated_at)
•	category: positive (REWARD: tốt) / negative (VIOLATION: xấu).
•	level: chỉ áp cho VIOLATION — minor / moderate / serious.
•	points: điểm cộng ưu tiên cho REWARD (liên kết UT06).
23. activities (Ghi nhận hoạt động)
activities(id, occupancy_id, student_id, activity_type_id,   activity_date, note, status, action_taken, created_at, updated_at)
•	
•	Xử lý theo mức: MINOR → nhắc nhở; MODERATE → cảnh cáo, tích lũy xét duyệt kỳ sau; SERIOUS → admin quyết định từng ca, có thể buộc thôi ở + blacklist.
•	
G. Thông báo & cấu hình
24. notifications (Thông báo)
notifications(id, student_id, title, content, type,   target_type, send_email, created_at)
•	send_email: đánh dấu có gửi kèm email không (nhắc nợ, kết quả duyệt đơn... thì gửi; thông báo chung thì không).
25. notification_recipient (Người nhận thông báo)
notification_recipient(id, notification_id, student_id, is_read, read_at)
26. settings (Cấu hình hệ thống)
settings(key, value, description)
Các key cần seed sẵn:
Key	Mặc định	Ý nghĩa
electricity_unit_price	2500	Đơn giá điện (đ/kWh)
room_fee_per_month	350000	Tiền phòng mặc định (đ/tháng)
payment_due_days	7	Hạn thanh toán sau ngày phát hành hóa đơn (ngày)
bed_selection_days	3	Số ngày sinh viên phải chọn giường sau phân phòng
max_room_change_per_semester	1	Số lần tối đa được đổi phòng/giường mỗi học kỳ
reminder_level_1_days	7	Quá hạn bao nhiêu ngày thì nhắc lần 1
reminder_level_2_days	30	Quá hạn bao nhiêu ngày thì nhắc lần 2
reminder_level_3_days	90	Quá hạn bao nhiêu ngày thì cảnh cáo buộc thôi ở
max_course_year_allowed	3	Năm học tối đa được duyệt tự động (năm 4 → duyệt tay)
rolling_min_days_before_end	30	Còn dưới X ngày tới cuối kỳ thì đóng kênh quanh năm
late_payment_count_threshold	3	Trễ ≥ X lần/kỳ thì chuyển duyệt tay kỳ sau

