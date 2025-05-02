import pandas as pd
import numpy as np
import os
import random

# Đường dẫn đến các file dữ liệu đầu vào
INPUT_DIR = 'new'
DIEM_CHUAN_FILE = os.path.join(INPUT_DIR, 'Diemchuan2020_2024_loc.csv')
HOC_SINH_FILE = os.path.join(INPUT_DIR, 'hoc_sinh_10000.csv')
CHI_TIEU_FILE = os.path.join(INPUT_DIR, 'chitieu_2020_2025.csv')
OUTPUT_FILE = os.path.join(INPUT_DIR, 'training_data_final.csv')

# Đọc file dữ liệu
try:
    diem_chuan_df = pd.read_csv(DIEM_CHUAN_FILE)
    hoc_sinh_df = pd.read_csv(HOC_SINH_FILE)
    chitieu_df = pd.read_csv(CHI_TIEU_FILE)
    print(f"Đã đọc các file dữ liệu thành công.")
except FileNotFoundError as e:
    print(f"Lỗi: Không tìm thấy file - {e}")
    print(f"Thư mục hiện tại: {os.getcwd()}")
    print(f"Kiểm tra xem file có tồn tại không: {os.path.exists(DIEM_CHUAN_FILE)}")
    exit()

# Xử lý và chuẩn hóa dữ liệu điểm chuẩn
print(f"Số dòng trong dữ liệu điểm chuẩn: {len(diem_chuan_df)}")
# Đổi tên cột cho phù hợp với script cũ
diem_chuan_df = diem_chuan_df.rename(columns={
    'Mã trường': 'Mã trường',  # giữ nguyên
    'Ngành': 'Ngành',          # giữ nguyên
    'Tổ hợp': 'Tổ hợp',        # giữ nguyên
    'Năm': 'Năm',              # giữ nguyên
    'Điểm chuẩn': 'Điểm chuẩn'  # giữ nguyên
})

# Lấy danh sách tất cả các trường có trong dữ liệu
all_schools = diem_chuan_df['Mã trường'].unique()
print(f"Tổng số trường trong dữ liệu: {len(all_schools)}")

# Tạo từ điển điểm chuẩn theo nhiều năm
diem_chuan_multiple_years = {}
for _, row in diem_chuan_df.iterrows():
    key = (row['Mã trường'], row['Ngành'].lower(), row['Tổ hợp'], row['Năm'])
    diem_chuan_multiple_years[key] = row['Điểm chuẩn']

# Tạo từ điển điểm chuẩn cho năm gần nhất để dùng khi không có dữ liệu lịch sử
latest_year = diem_chuan_df['Năm'].max()
diem_chuan_latest = {}
for _, row in diem_chuan_df[diem_chuan_df['Năm'] == latest_year].iterrows():
    key = (row['Mã trường'], row['Ngành'].lower(), row['Tổ hợp'])
    diem_chuan_latest[key] = row['Điểm chuẩn']

# Xử lý dữ liệu học sinh
print(f"Số học sinh: {len(hoc_sinh_df)}")
# Tạo các cột khối thi nếu chưa có - chỉ tính khi học sinh có đủ điểm thành phần
if 'KhoiA' not in hoc_sinh_df.columns:
    # Khối A = Toán + Lý + Hóa
    mask_khoiA = ~(hoc_sinh_df['Toan'].isna() | hoc_sinh_df['VatLy'].isna() | hoc_sinh_df['HoaHoc'].isna())
    hoc_sinh_df.loc[mask_khoiA, 'KhoiA'] = hoc_sinh_df.loc[mask_khoiA, 'Toan'] + hoc_sinh_df.loc[mask_khoiA, 'VatLy'] + hoc_sinh_df.loc[mask_khoiA, 'HoaHoc']
    
    # Khối A1 = Toán + Lý + Anh
    mask_khoiA1 = ~(hoc_sinh_df['Toan'].isna() | hoc_sinh_df['VatLy'].isna() | hoc_sinh_df['NgoaiNgu'].isna())
    hoc_sinh_df.loc[mask_khoiA1, 'KhoiA1'] = hoc_sinh_df.loc[mask_khoiA1, 'Toan'] + hoc_sinh_df.loc[mask_khoiA1, 'VatLy'] + hoc_sinh_df.loc[mask_khoiA1, 'NgoaiNgu']
    
    # Khối B = Toán + Hóa + Sinh
    mask_khoiB = ~(hoc_sinh_df['Toan'].isna() | hoc_sinh_df['HoaHoc'].isna() | hoc_sinh_df['SinhHoc'].isna())
    hoc_sinh_df.loc[mask_khoiB, 'KhoiB'] = hoc_sinh_df.loc[mask_khoiB, 'Toan'] + hoc_sinh_df.loc[mask_khoiB, 'HoaHoc'] + hoc_sinh_df.loc[mask_khoiB, 'SinhHoc']
    
    # Khối C = Văn + Sử + Địa
    mask_khoiC = ~(hoc_sinh_df['NguVan'].isna() | hoc_sinh_df['LichSu'].isna() | hoc_sinh_df['DiaLy'].isna())
    hoc_sinh_df.loc[mask_khoiC, 'KhoiC'] = hoc_sinh_df.loc[mask_khoiC, 'NguVan'] + hoc_sinh_df.loc[mask_khoiC, 'LichSu'] + hoc_sinh_df.loc[mask_khoiC, 'DiaLy']
    
    # Khối D = Văn + Toán + Anh
    mask_khoiD = ~(hoc_sinh_df['NguVan'].isna() | hoc_sinh_df['Toan'].isna() | hoc_sinh_df['NgoaiNgu'].isna())
    hoc_sinh_df.loc[mask_khoiD, 'KhoiD'] = hoc_sinh_df.loc[mask_khoiD, 'NguVan'] + hoc_sinh_df.loc[mask_khoiD, 'Toan'] + hoc_sinh_df.loc[mask_khoiD, 'NgoaiNgu']

# Xử lý dữ liệu chỉ tiêu
def process_chitieu(ct_str):
    if isinstance(ct_str, str):
        if '-' in ct_str:
            low, high = map(int, ct_str.split('-'))
            return (low + high) / 2
        elif ct_str.isdigit():
            return int(ct_str)
    return np.nan

# Tiền xử lý dữ liệu chỉ tiêu
chitieu_df['Chỉ tiêu'] = chitieu_df['Chỉ tiêu THPT (Ước tính)'].apply(process_chitieu)
chitieu_df['Ngành'] = chitieu_df['Ngành'].str.lower()

# Tính q0 theo từng ngành (chỉ tiêu trung bình)
# q0 là chỉ tiêu trung bình của ngành đó qua các năm và các trường, dùng làm giá trị tham chiếu
q0_by_major = {}
for nganh in chitieu_df['Ngành'].unique():
    nganh_data = chitieu_df[chitieu_df['Ngành'] == nganh]
    q0_by_major[nganh] = nganh_data['Chỉ tiêu'].mean()
    
# Điền giá trị NaN bằng giá trị trung bình của ngành tương ứng
for idx, row in chitieu_df.iterrows():
    if pd.isna(row['Chỉ tiêu']):
        chitieu_df.at[idx, 'Chỉ tiêu'] = q0_by_major[row['Ngành']]

# Tạo từ điển chỉ tiêu
chitieu_dict = {}
for _, row in chitieu_df.iterrows():
    if isinstance(row['Năm'], str) and '-' in row['Năm']:
        start, end = map(int, row['Năm'].split('-'))
        for year in range(start, end + 1):
            key = (row['Mã trường'], row['Ngành'], year)
            chitieu_dict[key] = {'Chỉ tiêu': row['Chỉ tiêu'], 'market_trend': row['market_trend']}
    else:
        try:
            year = int(row['Năm'])
            key = (row['Mã trường'], row['Ngành'], year)
            chitieu_dict[key] = {'Chỉ tiêu': row['Chỉ tiêu'], 'market_trend': row['market_trend']}
        except (ValueError, TypeError):
            print(f"Lỗi xử lý năm: {row['Năm']}")

print(f"Số chỉ tiêu: {len(chitieu_dict)}")

# Hàm tính xu hướng điểm chuẩn
def calculate_score_trend(truong, nganh, tohop):
    years = sorted(diem_chuan_df['Năm'].unique())
    scores = []
    
    for year in years:
        key = (truong, nganh, tohop, year)
        if key in diem_chuan_multiple_years:
            scores.append((year, diem_chuan_multiple_years[key]))
    
    if len(scores) >= 2:
        # Tính xu hướng dựa trên những năm có dữ liệu
        years_array = np.array([s[0] for s in scores])
        scores_array = np.array([s[1] for s in scores])
        slope, _ = np.polyfit(years_array, scores_array, 1)
        return slope  # Slope > 0 nghĩa là xu hướng tăng, < 0 là giảm
    else:
        return 0  # Không đủ dữ liệu để tính xu hướng

# Hàm tính điểm chuẩn dự kiến (cải tiến)
def calculate_expected_score(mu, t, q, q0, score_trend, alpha=0.5, beta=1.0, gamma=0.7):
    """
    Tính điểm chuẩn dự kiến với trọng số cao hơn cho xu hướng điểm chuẩn
    mu: điểm chuẩn trung bình
    t: xu hướng thị trường
    q: chỉ tiêu năm dự đoán
    q0: chỉ tiêu trung bình của ngành
    score_trend: xu hướng điểm chuẩn qua các năm
    """
    return round(mu + alpha * t - beta * (q / q0 - 1) + gamma * score_trend, 2)

# Danh sách ngành và tổ hợp từ dữ liệu điểm chuẩn
nganh_to_tohop = {}
for _, row in diem_chuan_df.iterrows():
    nganh = row['Ngành'].lower()
    tohop = row['Tổ hợp']
    if nganh not in nganh_to_tohop:
        nganh_to_tohop[nganh] = []
    if tohop not in nganh_to_tohop[nganh]:
        nganh_to_tohop[nganh].append(tohop)

# Tạo danh sách mã trường theo ngành
truong_by_nganh = {}
for _, row in diem_chuan_df.iterrows():
    nganh = row['Ngành'].lower()
    truong = row['Mã trường']
    if nganh not in truong_by_nganh:
        truong_by_nganh[nganh] = []
    if truong not in truong_by_nganh[nganh]:
        truong_by_nganh[nganh].append(truong)

# Tạo bảng ánh xạ tổ hợp sang khối thi
khoi_mapping = {'A00': 'KhoiA', 'A01': 'KhoiA1', 'B00': 'KhoiB', 'C00': 'KhoiC', 'D01': 'KhoiD'}

# Trọng số cho các năm - năm gần đây có trọng số cao hơn
years = sorted(diem_chuan_df['Năm'].unique())
year_weights = {}
total_weight = sum(range(1, len(years) + 1))
for i, year in enumerate(years):
    year_weights[year] = (i + 1) / total_weight

# Năm dự đoán
target_year = latest_year + 1

# Tham số điều chỉnh quan trọng
ALLOW_SCORE_DIFF = 3.0  # Học sinh thường chọn ngành có điểm chuẩn ±3 so với điểm của mình

# Chuẩn bị dữ liệu: tìm tất cả các điểm khối thi của học sinh
print("Đang tìm các tổ hợp xét tuyển phù hợp cho mỗi học sinh...")
student_options = []

for idx, hs in hoc_sinh_df.iterrows():
    # In ra tiến độ
    if idx % 100 == 0:
        print(f"Đã xử lý {idx}/{len(hoc_sinh_df)} học sinh ({idx/len(hoc_sinh_df)*100:.2f}%)")
    
    # Tìm tổ hợp có điểm cao nhất cho học sinh này
    best_tohop = None
    best_diem = -1
    
    for tohop, khoi in khoi_mapping.items():
        if khoi in hs and not pd.isna(hs[khoi]):
            diem = hs[khoi]
            if diem > best_diem:
                best_diem = diem
                best_tohop = tohop
    
    if best_tohop is None:
        continue  # Bỏ qua học sinh không có điểm tổ hợp nào
    
    # Với tổ hợp tốt nhất, tìm tất cả các ngành và trường phù hợp
    valid_options = []
    
    for nganh, tohop_list in nganh_to_tohop.items():
        if best_tohop in tohop_list:
            for truong in truong_by_nganh.get(nganh, []):
                # Tính điểm chuẩn trung bình
                mu_values = []
                for year in years:
                    key = (truong, nganh, best_tohop, year)
                    if key in diem_chuan_multiple_years:
                        mu_values.append((diem_chuan_multiple_years[key], year_weights[year]))
                
                # Nếu có dữ liệu lịch sử, tính trung bình có trọng số
                if mu_values:
                    mu = sum(val * weight for val, weight in mu_values) / sum(weight for _, weight in mu_values)
                    mu = round(mu, 2)  # Làm tròn 2 chữ số thập phân
                else:
                    # Nếu không có dữ liệu lịch sử, dùng điểm chuẩn năm gần nhất nếu có
                    key_latest = (truong, nganh, best_tohop)
                    if key_latest in diem_chuan_latest:
                        mu = round(diem_chuan_latest[key_latest], 2)
                    else:
                        continue  # Bỏ qua nếu không có dữ liệu
                
                # Tính xu hướng điểm chuẩn
                score_trend = calculate_score_trend(truong, nganh, best_tohop)
                score_trend = round(score_trend, 2)  # Làm tròn 2 chữ số thập phân
                
                # Lấy chỉ tiêu và market trend
                chitieu_info = chitieu_dict.get((truong, nganh, target_year), None)
                if not chitieu_info and target_year - 1 in years:
                    chitieu_info = chitieu_dict.get((truong, nganh, target_year - 1), None)
                
                if not chitieu_info:
                    q = q0_by_major.get(nganh, 100)
                    t = 0.5
                else:
                    q = chitieu_info['Chỉ tiêu']
                    t = chitieu_info['market_trend']
                
                q = round(q, 2)  # Làm tròn 2 chữ số thập phân
                t = round(t, 2)  # Làm tròn 2 chữ số thập phân
                q0 = round(q0_by_major.get(nganh, q), 2)  # Làm tròn 2 chữ số thập phân
                
                # Tính điểm chuẩn dự kiến (với trọng số cao hơn cho xu hướng)
                expected_score = calculate_expected_score(mu, t, q, q0, score_trend)
                
                # Tính xác suất trúng tuyển
                diem = round(best_diem, 2)  # Làm tròn 2 chữ số thập phân
                k = 1.0
                P = 1 / (1 + np.exp(-k * (diem - expected_score)))
                P = round(P, 4)  # Làm tròn 4 chữ số thập phân cho xác suất
                
                # Tính khoảng cách giữa điểm học sinh và điểm chuẩn dự kiến
                score_diff = abs(diem - expected_score)
                
                valid_options.append({
                    'SBD': hs['SBD_New'],
                    'Trường': truong,
                    'Ngành': nganh,
                    'Tổ hợp': best_tohop,
                    'Năm': target_year,
                    'Điểm học sinh': diem,
                    'Điểm chuẩn trung bình': mu,
                    'Điểm chuẩn dự kiến': expected_score,
                    'Chỉ tiêu': q,
                    'q0': q0,
                    'Market trend': t,
                    'Xu hướng điểm chuẩn': score_trend,
                    'Xác suất trúng tuyển': P,
                    'Chênh lệch điểm': score_diff  # Trường tạm thời để sắp xếp, sẽ loại bỏ sau
                })
    
    # Thêm vào danh sách tổng
    if valid_options:
        student_options.append((hs['SBD_New'], valid_options))

print(f"Tìm thấy {len(student_options)} học sinh có ít nhất một tổ hợp xét tuyển phù hợp")

# Đảm bảo phân bố đều các trường
school_distribution = {school: 0 for school in all_schools}
train_data = []

# Tạo bộ dữ liệu huấn luyện với 1 dòng cho mỗi học sinh
print("Đang tạo dữ liệu huấn luyện với phân bố đều các trường...")
random.shuffle(student_options)  # Xáo trộn danh sách học sinh để không bị thiên lệch

for sbd, options in student_options:
    # Chia các tùy chọn thành 2 nhóm: trong và ngoài khoảng ±3 điểm
    options_in_range = [opt for opt in options if opt['Chênh lệch điểm'] <= ALLOW_SCORE_DIFF]
    options_out_range = [opt for opt in options if opt['Chênh lệch điểm'] > ALLOW_SCORE_DIFF]
    
    # Sắp xếp các tùy chọn trong khoảng theo mức độ chênh lệch điểm (ưu tiên gần hơn)
    options_in_range = sorted(options_in_range, key=lambda x: x['Chênh lệch điểm'])
    
    # 90% khả năng chọn từ trong khoảng ±3 điểm, 10% chọn ngoài khoảng
    if options_in_range and random.random() < 0.9:
        candidate_options = options_in_range
    else:
        candidate_options = options_out_range if options_out_range else options
    
    if not candidate_options:
        continue
    
    # Ưu tiên chọn các trường có tần suất thấp để cân bằng phân phối
    school_counts = [(opt['Trường'], school_distribution[opt['Trường']]) 
                     for opt in candidate_options 
                     if opt['Trường'] in school_distribution]
    
    if school_counts:
        # Sắp xếp theo tần suất xuất hiện của trường (ưu tiên trường ít xuất hiện)
        school_counts.sort(key=lambda x: x[1])
        
        # Lấy các trường có tần suất thấp nhất
        min_count = school_counts[0][1]
        min_schools = [sc[0] for sc in school_counts if sc[1] == min_count]
        
        # Lọc các tùy chọn chỉ giữ lại trường có tần suất thấp nhất
        best_options = [opt for opt in candidate_options if opt['Trường'] in min_schools]
        
        # Nếu không tìm được, sử dụng tất cả các tùy chọn
        if not best_options:
            best_options = candidate_options
    else:
        best_options = candidate_options
    
    # Chọn một tùy chọn từ các tùy chọn tốt nhất (ưu tiên xác suất cao hơn)
    selected_option = sorted(best_options, key=lambda x: x['Xác suất trúng tuyển'], reverse=True)[0]
    
    # Cập nhật tần suất xuất hiện của trường
    if selected_option['Trường'] in school_distribution:
        school_distribution[selected_option['Trường']] += 1
    
    # Loại bỏ trường "Chênh lệch điểm" trước khi thêm vào dữ liệu huấn luyện
    selected_option.pop('Chênh lệch điểm', None)
    train_data.append(selected_option)

# Kiểm tra phân bố trường
print("Phân bố theo trường:")
for school, count in sorted(school_distribution.items(), key=lambda x: -x[1]):
    if count > 0:
        print(f"  {school}: {count} học sinh")

# Kiểm tra và lưu file
train_df = pd.DataFrame(train_data)
if train_df.empty:
    print("Lỗi: Dữ liệu training trống! Kiểm tra dữ liệu đầu vào hoặc logic gán nhãn.")
else:
    train_df.to_csv(OUTPUT_FILE, index=False)
    print(f"Đã lưu file {OUTPUT_FILE} với {len(train_df)} dòng.")
    print(f"Tóm tắt dữ liệu:")
    print(f"- Số học sinh: {len(train_df['SBD'].unique())}")
    print(f"- Số ngành: {len(train_df['Ngành'].unique())}")
    print(f"- Số trường: {len(train_df['Trường'].unique())}")
    print(f"- Số tổ hợp: {len(train_df['Tổ hợp'].unique())}")
    print(f"- Thống kê xác suất trúng tuyển:")
    print(train_df['Xác suất trúng tuyển'].describe()) 