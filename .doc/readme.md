ỨNG DỤNG QUẢN LÝ KÝ TÚC XÁ ĐH CÔNG NGHỆ SÀI GÒN
I. TỔNG QUAN HỆ THỐNG
1. Mục tiêu
­	Xây dựng hệ thống quản lý ký túc xá trực tuyến, thay thế phương thức thủ công, giúp sinh viên đăng ký, theo dõi và thanh toán trực tuyến, hỗ trợ ban quản lý trong việc duyệt đơn, phân phòng, quản lý điện, thu phí và báo cáo.
2. Phạm vi
­	Khu vực Ký túc xá Trường Đại học Công nghệ Sài Gòn (STU): 1 tòa nhà, 2 tầng:
+ Tầng 1 (Nam): 9 phòng (101 → 109)
+ Tầng 2 (Nữ): 10 phòng (201 → 210)
+ Mỗi phòng: 14 giường đôi (2 trên, 2 dưới), đánh số 1 → 14.
II. NGHIỆP VỤ CHI TIẾT (SỬA & BỔ SUNG)
1. Quản lý phòng & giường
­	Mỗi phòng có:
	Số phòng, tầng, giới tính áp dụng (nam/nữ theo tầng)
	Sức chứa tối đa: 14 giường
	Danh sách giường: STT từ 1 → 14, mỗi giường có trạng thái trống đã chiếm
-	Quy tắc:
	Không phân sinh viên khác giới vào cùng phòng
	Không vượt quá số giường trống
	Một sinh viên chỉ được ở một giường trong một thời điểm
2. Quản lý đăng ký nội trú & phân phòng
­	Sinh viên gửi đơn đăng ký nội trú online (điền đầy đủ thông tin cá nhân, MSSV, lớp, khoa, giới tính, thông tin người thân).
­	Admin Xem danh sách đơn đăng ký chờ duyệt
­	Admin Duyệt hoặc từ chối đơn (kèm lý do nếu từ chối).
­	Hệ thống Sau khi duyệt, hiển thị danh sách các phòng còn trống, đúng giới tính, kèm theo: Số phòng, số giường, tầng nào trống hiện tại
­	Hệ thống gợi ý phòng có số sinh viên ít nhất (ưu tiên phòng còn nhiều giường trống). Đảm bảo đúng giới tính (nam → tầng 1, nữ → tầng 2)
­	Admin chọn 1 phòng cho sinh viên.
­	Sau khi được phân phòng, sinh viên có quyền truy cập chức năng “chọn giường”.
­	Sinh viên xem danh sách giường trong phòng đã được phân, bao gồm trạng thái (trống / đã chiếm / bảo trì).
­	Sinh viên chọn 1 giường còn trống.
­	Hệ thống kiểm tra:
o	Tính hợp lệ của giường tại thời điểm chọn nhằm đảm bảo không xảy ra xung đột dữ liệu.
o	Sinh viên chưa được gán giường trước đó trong hệ thống.
­	Nếu hợp lệ:
o	Gán giường cho sinh viên
o	Cập nhật trạng thái giường thành “đã chiếm”
o	Tạo hợp đồng
­	Nếu giường đã được người khác chọn trước:
o	Hệ thống thông báo lỗi
o	Sinh viên phải chọn lại giường khác
­	Không cho phép sinh viên yêu cầu thay đổi phòng hoặc giường sau khi đã chọn thành công.
3. Quản lý hợp đồng
­	Hợp đồng được tạo sau khi sinh viên chọn giường thành công.
­	Thời hạn hợp đồng: 1 năm học (có thể cấu hình ngày bắt đầu/kết thúc theo năm học).
­	Sinh viên xác nhận ký kết online.
­	Trạng thái hợp đồng: hiệu lực, hết hạn, hủy (khi vi phạm nặng hoặc sinh viên tự ý bỏ ở).
­	Một sinh viên chỉ có 1 hợp đồng hiệu lực tại một thời điểm.
­	Không hoàn tiền phòng nếu hủy hợp đồng trước hạn.
4. Quản lý tiền điện
­	Hàng tháng (ngày 1), admin nhập chỉ số điện cũ (cuối tháng trước) và mới (đầu tháng này) theo từng phòng.
­	Hệ thống tự tính:
	Số điện dùng = chỉ số mới – chỉ số cũ
	Tổng tiền điện phòng = số điện dùng × 2.500đ
	Tiền điện mỗi sinh viên = tổng tiền điện phòng / số sinh viên trong phòng (làm tròn đến 2 chữ số thập phân, hoặc theo quy tắc làm tròn của nhà trường)
	Trường hợp sinh viên ở không trọn tháng:
	Tiền điện được tính theo số ngày thực tế ở.
	Công thức: (tổng tiền điện phòng / tổng số ngày trong tháng) × số ngày sinh viên ở.
	Hạn thanh toán tiền điện: 7 ngày kể từ ngày ra thông báo (ngày 1 hàng tháng).
5. Quản lý tiền phòng
­	Tiền phòng cố định: 350.000đ/tháng → 1.050.000đ/quý.
­	Chu kỳ thu phí (lặp lại hàng năm):
	Quý I: 25/12 → 10/01
	Quý II: 25/03 → 10/04
	Quý III: 25/06 → 10/07
	Quý IV: 25/09 → 10/10
­	Hóa đơn tiền phòng được tạo theo quý, không theo tháng.
­	Không hoàn tiền phòng nếu hủy hợp đồng giữa quý.
6. Quản lý vi phạm & xử lý
­	Admin ghi nhận vi phạm: loại vi phạm, thời gian, mức độ (nhẹ/trung bình/nghiêm trọng).
­	Nếu vi phạm nghiêm trọng → chấm dứt hợp đồng, yêu cầu sinh viên ra khỏi ký túc xá.
­	Vi phạm liên quan đến trễ thanh toán:
	Quá hạn thanh toán tiền phòng hoặc tiền điện → sẽ không được ở tiếp (chấm dứt hợp đồng).
7. Báo cáo & thống kê
­	Số lượng sinh viên theo phòng, theo tầng, theo giới tính
­	Tỷ lệ lấp đầy giường/phòng
­	Doanh thu thực tế (tiền phòng, tiền điện)
­	Công nợ (chưa thanh toán, quá hạn)
­	Thống kê vi phạm
III. CHỨC NĂNG THEO ROLE
1.	Role Sinh Viên
1.1.	Quản lý tài khoản
-	Đăng ký tài khoản, nhập MSSV, email, mật khẩu, kích hoạt qua email.
-	Đăng nhập / đăng xuất.
-	Cập nhật thông tin cá nhân: họ tên, số điện thoại, email, thông tin người thân (tên, số điện thoại, quan hệ).
-	Đổi mật khẩu.
-	Xem thông tin cá nhân.
1.2.	Đăng ký nội trú
-	Đăng ký ở ký túc xá: điền form (họ tên, MSSV, lớp, khoa, giới tính, sđt, số cccd, nơi thường trú, thông tin người thân).
-	Xem trạng thái đơn đăng ký: chờ duyệt / đã duyệt / từ chối (kèm lý do nếu bị từ chối).
-	Mỗi sinh viên chỉ được gửi một đơn đăng ký tại một thời điểm khi đơn đang ở trạng thái "chờ duyệt". Nếu đơn bị từ chối, sinh viên mới được phép gửi đơn đăng ký mới. Nếu đơn đã được duyệt và sinh viên đã có hợp đồng hiệu lực, không được phép gửi thêm đơn nào khác.

1.3.	Chỗ ở & hợp đồng
-	Sau khi được phân phòng, sinh viên có thể chọn giường trong phòng đã được phân.
-	Xem danh sách giường và trạng thái (trống / đã chiếm / bảo trì)
-	Chọn giường còn trống.
-	Sau khi chọn thành công:
o	Xem thông tin phòng và giường
o	Xem hợp đồng điện tử: nội dung, điều khoản, thời hạn (1 năm học).
-	Xác nhận ký kết hợp đồng trực tuyến.
-	Yêu cầu hủy hợp đồng (báo thôi ở): sinh viên gửi yêu cầu chấm dứt hợp đồng trước hạn (không hoàn tiền phòng). Chờ admin duyệt.
1.4.	Hóa đơn & thanh toán
-	Xem danh sách hóa đơn tiền phòng (theo quý, chi tiết, hạn thanh toán).
-	Xem danh sách hóa đơn tiền điện (theo tháng, chi tiết, hạn thanh toán).
-	Thanh toán trực tuyến qua VNPay hoặc chuyển khoản.
-	Xem lịch sử thanh toán (tiền phòng, tiền điện, phí phạt nếu có).
-	Tải hóa đơn dạng PDF.
1.5.	Thông báo
-	Xem thông báo từ ban quản lý (toàn hệ thống hoặc gửi riêng).


2.	Role Admin
2.1.	Quản lý sinh viên
-	Thêm mới sinh viên vào hệ thống (MSSV, họ tên, lớp, khoa, giới tính, cccd, số điện thoại, email).
-	Sửa thông tin sinh viên.
-	Xóa sinh viên (hoặc vô hiệu hóa khi không còn ở ký túc xá).
-	Tìm kiếm sinh viên theo MSSV, họ tên, lớp, khoa hoặc trạng thái cư trú.
-	Xem danh sách sinh viên đang ở ký túc xá (những sinh viên có hợp đồng đang hiệu lực).
-	Lọc danh sách sinh viên theo phòng, theo tầng, theo giới tính.
-	Xem chi tiết danh sách sinh viên trong một phòng cụ thể (gồm MSSV, họ tên, số giường đang ở).
2.2.	Quản lý phòng & giường
-	Tạo phòng mới: nhập số phòng, tầng, loại phòng (nam/nữ theo tầng).
-	Sửa thông tin phòng.
-	Xóa phòng (chỉ xóa được khi không còn sinh viên ở).
-	Thiết lập sức chứa tối đa của phòng (mặc định 14 giường, có thể điều chỉnh).
-	Xem danh sách giường trong phòng (STT 1 → 14) và trạng thái (trống / đã chiếm).
-	Cập nhật trạng thái phòng: còn trống / đã đầy / đang bảo trì.
2.3.	Duyệt đăng ký nội trú 
-	Xem danh sách đơn đăng ký chờ duyệt.
-	Duyệt hoặc từ chối đơn (kèm lý do nếu từ chối).
-	Kiểm tra điều kiện: sinh viên không được có hợp đồng hiệu lực.
2.4.	Phân phòng 
-	Sau khi duyệt đơn, hệ thống hiển thị danh sách các phòng còn trống, đúng giới tính, không bảo trì, kèm theo:
-	Số phòng, tầng.
-	Số giường trống hiện tại.
-	Gợi ý phòng có số sinh viên ít nhất (ưu tiên phòng trống nhiều giường).
-	Admin chọn 1 phòng từ danh sách (có thể chọn theo gợi ý hoặc chọn phòng khác).
-	Hệ thống chỉ gán phòng, không gán giường.
-	Sinh viên sẽ tự chọn giường trong phòng đã được phân.
-	Admin có thể theo dõi trạng thái giường trong phòng.
-	Xem kết quả phân phòng.
2.5.	Quản lý hợp đồng
-	Xem danh sách hợp đồng (theo sinh viên, theo phòng, theo trạng thái).
-	Hủy hợp đồng khi sinh viên vi phạm nghiêm trọng hoặc khi sinh viên báo thôi ở (sau khi xác nhận).
-	Lưu ý: Không có chức năng gia hạn hợp đồng. Nếu sinh viên muốn ở năm học tiếp theo, phải tạo hợp đồng mới từ đầu (đăng ký lại).
2.6.	Quản lý tiền điện
-	Nhập chỉ số điện cũ (cuối tháng trước) và chỉ số điện mới (đầu tháng này) theo từng phòng, định kỳ hàng tháng (ngày 1).
-	Hệ thống tự động tính:
	Số điện dùng = chỉ số mới – chỉ số cũ.
	Tổng tiền điện phòng = số điện dùng × 2.500đ.
	Tiền điện mỗi sinh viên = tổng tiền điện phòng / số sinh viên trong phòng (làm tròn theo quy định).
-	Xem danh sách tiền điện đã tính.
2.7.	Quản lý phí & thanh toán
-	Tự động tạo hóa đơn tiền phòng theo quý (đúng chu kỳ: 25/12→10/01, 25/03→10/04, 25/06→10/07, 25/09→10/10).
-	Xem danh sách thanh toán: đã thanh toán / chưa thanh toán / quá hạn.
-	Cập nhật trạng thái thanh toán thủ công (cho trường hợp chuyển khoản ngoài hệ thống).
-	Xem lịch sử thanh toán của từng sinh viên.
2.8.	Quản lý vi phạm
-	Quản lý danh sách loại vi phạm:
	Thêm loại vi phạm mới (ví dụ: hút thuốc, gây mất trật tự, đập phá tài sản, sử dụng điện trái phép...).
	Sửa tên hoặc mức độ vi phạm.
	Xóa loại vi phạm (nếu chưa được ghi nhận cho sinh viên nào).
	Gán mức độ cho mỗi loại vi phạm: nhẹ / trung bình / nghiêm trọng.
-	Ghi nhận vi phạm cho sinh viên: chọn sinh viên, chọn loại vi phạm, nhập thời gian, ghi chú.
-	Xem danh sách vi phạm theo sinh viên, theo phòng, theo thời gian.
-	Chấm dứt hợp đồng ngay khi vi phạm nghiêm trọng hoặc khi sinh viên quá hạn thanh toán (tiền phòng hoặc tiền điện).
-	Lưu ý: Chỉ được xóa loại vi phạm khi chưa có bất kỳ sinh viên nào bị ghi nhận vi phạm với loại đó. Nếu đã có sinh viên vi phạm, chỉ được phép sửa tên hoặc vô hiệu hóa (không xóa).
2.9.	Xử lý yêu cầu hủy hợp đồng từ sinh viên (báo thôi ở)
-	Xem danh sách yêu cầu hủy hợp đồng từ sinh viên.
-	Duyệt yêu cầu: hợp đồng chấm dứt, sinh viên được chuyển sang trạng thái "đã thôi ở", không hoàn tiền phòng.
-	Từ chối yêu cầu (kèm lý do, nếu cần).
2.10.	Báo cáo & thống kê
-	Xuất báo cáo số lượng sinh viên theo phòng, theo tầng, theo giới tính.
-	Xuất báo cáo tỷ lệ lấp đầy giường/phòng.
-	Xuất báo cáo doanh thu thực tế (tiền phòng, tiền điện).
-	Xuất báo cáo công nợ (chưa thanh toán, quá hạn).
-	Xuất báo cáo thống kê vi phạm (theo loại vi phạm, theo sinh viên, theo thời gian).
-	Hỗ trợ xuất file PDF hoặc Excel cho tất cả báo cáo.
2.11.	Thông báo
-	Gửi thông báo đến toàn bộ sinh viên đang ở ký túc xá.
-	Gửi thông báo đến từng sinh viên cụ thể.
-	Thông báo hiển thị trên hệ thống và có thể gửi kèm email.
IV. CÁC QUY TẮC NGHIỆP VỤ (RULES) – TÓM TẮT
-	Một sinh viên chỉ được ở một giường, một phòng tại một thời điểm.
-	Không phân phòng khác giới.
-	Không vượt quá sức chứa giường của phòng.
-	Không tạo hợp đồng nếu chưa phân phòng.
-	Không cho đăng ký nếu sinh viên đang có hợp đồng hiệu lực.
-	Phân phòng do admin chọn.
-	Sinh viên tự chọn giường trong phòng đã được phân.
-	Hệ thống đảm bảo mỗi giường chỉ có một sinh viên tại một thời điểm.
-	Việc chọn giường được xử lý theo nguyên tắc “ai chọn trước được trước” (first-come-first-served).
-	Không cho phép thay đổi giường sau khi đã chọn.
-	Hệ thống áp dụng cơ chế kiểm soát đồng thời (concurrency control) khi sinh viên chọn giường nhằm đảm bảo không xảy ra tình trạng nhiều sinh viên cùng chiếm một giường.
-	Sinh viên phải chọn giường trong khoảng thời gian quy định sau khi được phân phòng, nếu quá thời gian hệ thống có thể tự động hủy phân phòng hoặc chuyển trạng thái.
-	Việc chọn giường được thực hiện thông qua cơ chế cập nhật trạng thái giường có điều kiện nhằm đảm bảo tính nguyên tử (atomic) và tránh xung đột khi nhiều sinh viên thao tác đồng thời.
-	Tiền điện chia đều theo đầu người, trừ trường hợp ở không trọn tháng → tính theo ngày.
-	Trễ thanh toán (tiền phòng hoặc tiền điện) → chấm dứt hợp đồng, không được ở tiếp.
-	Hủy hợp đồng trước hạn → không hoàn tiền phòng.
-	Sinh viên không được quyền yêu cầu chuyển phòng.


ỨNG DỤNG QUẢN LÝ KÝ TÚC XÁ ĐH CÔNG NGHỆ SÀI GÒN
I.	Cơ sở dữ liệu
1.		building
Lưu trữ thông tin các tòa nhà trong khu ký túc xá, hỗ trợ mở rộng nhiều tòa sau này
-	building(building_code, name, address, total_floors, gender_config, status, created_at, updated_at)

2.	room (Phòng)
Lưu trữ thông tin các phòng trong ký túc xá, bao gồm tầng, giới tính áp dụng, sức chứa và giá phòng theo quý. Từ số phòng tự sinh ra số tầng, ví dụ 101 là tầng 1
-	room(id, building_code, room_number, capacity, price_per_quarter, status, created_at, updated_at)
-	UNIQUE(building_code, room_number)
3.	bed (Giường)
Quản lý danh sách giường trong từng phòng, trạng thái trống/đã chiếm và sinh viên đang ở.
-	bed(id, room_id, bed_number, position, status, created_at, updated_at)
-	UNIQUE(room_id, bed_number)
-	status: empty / occupied / broken
4.	student (Sinh viên)
Lưu trữ thông tin cá nhân và thông tin người thân của sinh viên đăng ký ở ký túc xá
-	student(id, student_code, avatar ,full_name, gender, class_name, faculty, phone, email, cccd, permanent_address, password, parent_name, parent_phone, parent_relationship, status, created_at, updated_at)

5.	registration (Đơn đăng ký)
Lưu trữ đơn đăng ký ở ký túc xá của sinh viên, trạng thái duyệt và lý do nếu bị từ chối.
-	registration(id, student_id, cccd_front_url, cccd_back_url, semester, status, note, reason, approved_by, approved_at, assigned_room_id, created_at, updated_at)

6.	Bảng contract (Hợp đồng)
Lưu trữ hợp đồng thuê phòng sau khi sinh viên được phân phòng thành công.
contract(id, registration_id, student_id, room_id, bed_id, start_date, end_date, status, signed_at, bed_selected_at, created_at, updated_at)
7.	Bảng electricity_record (Ghi nhận chỉ số điện)
Ghi nhận chỉ số điện cũ và mới của từng phòng theo tháng để tính tiền điện.
-	electricity_record(id, room_id, month_year, old_index, new_index, usage_kwh, unit_price, total_amount, recorded_by, recorded_at, status, created_at, updated_at)

8.	Bảng electricity_bill (Hóa đơn tiền điện)
Hóa đơn tiền điện chi tiết cho từng sinh viên, bao gồm số điện tiêu thụ, đơn giá, tỷ lệ ngày ở và hạn thanh toán.
-	electricity_bill(id, student_id, contract_id, month_year, usage_kwh, unit_price, amount, due_date, status, paid_at, payment_method, transaction_code, created_at, updated_at)

9.	Bảng room_fee_bill (Hóa đơn tiền phòng)
Hóa đơn tiền phòng theo quý cho từng sinh viên.
-	room_fee_bill(id, student_id, contract_id, quarter, year, amount, due_date, status, paid_at, payment_method, transaction_code, created_at, updated_at)

10.	Bảng electricity_payment (Thanh toán tiền điện) 
Lưu lịch sử thanh toán hóa đơn tiền điện. 
-	electricity_payment(id, electricity_bill_id, amount, method, status, transaction_code, paid_at)
11.	Bảng room_fee_payment (Thanh toán tiền phòng)
Lưu lịch sử thanh toán hóa đơn tiền phòng.
-	room_fee_payment(id, room_fee_bill_id, amount, method, status, transaction_code, paid_at)
12.	Bảng violation_type (Loại vi phạm)
Danh mục các loại vi phạm và mức độ (nhẹ, trung bình, nghiêm trọng).
-	violation_type(id, name, level, description, status, created_at, updated_at)



13.	Bảng violation (Vi phạm)
Ghi nhận vi phạm cụ thể của sinh viên.
-	violation(id, student_id, type_id, room_id, date, note, created_by, created_at)

14.	Bảng account (Tài khoản)
Quản lý tài khoản đăng nhập của sinh viên và admin.
-	account(id, student_id, email, password, role, is_active, created_at, updated_at)

15.	Bảng notification (Thông báo)
Lưu trữ thông báo từ ban quản lý gửi đến sinh viên (toàn hệ thống hoặc cá nhân).
-	notification(id, student_id, title, content, type, is_read, created_by, created_at)
16.	Bảng setting 
Lưu các tham số cấu hình của hệ thống, có thể thay đổi mà không cần sửa code.
-	settings(key, value, description, created_at, updated_at)	

🎯 1. Khi nào NÊN giữ settings
👉 Nếu bạn muốn hệ thống “có tư duy thiết kế” hơn
Ví dụ bạn đang có:
electricity_price = 2500
room_price = 1050000
timeout = 7 ngày
________________________________________
❌ Nếu hard-code:
$price = 2500;
👉 bị:
•	cứng 
•	đổi là phải sửa code 
________________________________________
✅ Nếu dùng settings:
settings(key='electricity_price', value='2500')
👉 lợi:
•	đổi trong DB 
•	không cần deploy lại

•	Nếu thầy hỏi:
•	❓ “Tại sao không dùng lock?”
•	👉 trả lời:
•	“Hệ thống sử dụng cơ chế optimistic locking thông qua câu lệnh cập nhật có điều kiện để đảm bảo mỗi giường chỉ được gán cho một sinh viên tại một thời điểm, giúp đơn giản hóa thiết kế nhưng vẫn đảm bảo tính nhất quán dữ liệu.”
•	________________________________________
•	❓ “Nếu 2 người chọn cùng giường?”
•	👉 trả lời:
•	“Chỉ một câu lệnh update thành công, các yêu cầu sau sẽ thất bại do điều kiện WHERE status='empty' không còn đúng.”


🎯 total_floors KHÔNG PHẢI ĐỂ TÍNH TRUNG BÌNH HAY CHIA NAM NỮ
Vai trò thực tế của total_floors:
Mục đích	Mô tả
Thông tin quản lý	Cho admin biết tòa nhà có bao nhiêu tầng
Hỗ trợ giao diện	Khi admin tạo phòng mới, hiển thị để biết tầng nào đã có phòng, tầng nào chưa
Tiện ích hiển thị	Dùng để hiển thị trên dashboard: "Tòa A - 2 tầng"
________________________________________
🔍 Còn việc chia nam/nữ theo tầng thì sao?
Việc chia nam/nữ được xử lý bởi gender_config, KHÔNG liên quan đến total_floors.
•	gender_config = cấu hình tầng nào là nam, tầng nào là nữ
•	total_floors = chỉ để biết tòa có bao nhiêu tầng
Ví dụ:
•	Tòa A: total_floors = 2, gender_config = {"1":"male","2":"female"}
•	Tòa B: total_floors = 4, gender_config = {"1":"male","2":"male","3":"female","4":"female"}

