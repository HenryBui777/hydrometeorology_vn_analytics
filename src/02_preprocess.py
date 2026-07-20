import pandas as pd
import os

def clean_data(input_path, output_path):
    print(f"Reading raw data from {input_path}...")
    df = pd.read_csv(input_path)

    print("Initial shape:", df.shape)

    # 1. Drop useless or incorrectly formatted columns
    columns_to_drop = [
        'sunrise', 'sunset', 'snowfall_sum', 
        'uv_index_max', 'uv_index_clear_sky_max', 'precipitation_probability_max'
    ]
    
    # Only drop columns that actually exist in the dataframe
    existing_cols_to_drop = [col for col in columns_to_drop if col in df.columns]
    df.drop(columns=existing_cols_to_drop, inplace=True)
    print(f"Dropped columns: {existing_cols_to_drop}")

    # 2. Rename columns to be more concise (Better for AI prompt)
    rename_mapping = {
        'temperature_2m_mean': 'temp_mean',
        'temperature_2m_max': 'temp_max',
        'temperature_2m_min': 'temp_min',
        'apparent_temperature_mean': 'app_temp_mean',
        'apparent_temperature_max': 'app_temp_max',
        'apparent_temperature_min': 'app_temp_min',
        'relative_humidity_2m_mean': 'humidity_mean',
        'wind_speed_10m_max': 'wind_speed_max',
        'wind_gusts_10m_max': 'wind_gusts_max',
        'et0_fao_evapotranspiration': 'et0',
        'pressure_msl_mean': 'pressure',
        'cloud_cover_mean': 'cloud_cover',
        'dew_point_2m_mean': 'dew_point'
    }
    df.rename(columns=rename_mapping, inplace=True)

    # 3. Handle missing values
    # Fill remaining missing values with 0
    df.fillna(0, inplace=True)

    # 4. Round numerical data to 2 decimal places to save space
    numeric_cols = df.select_dtypes(include=['float64', 'float32']).columns
    df[numeric_cols] = df[numeric_cols].round(2)

    # Save to output path
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    
    print(f"\nCleaned data saved to {output_path}")
    print("Final shape:", df.shape)
    
    # Print file size comparison
    raw_size = os.path.getsize(input_path) / (1024 * 1024)
    clean_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"Raw file size: {raw_size:.2f} MB")
    print(f"Cleaned file size: {clean_size:.2f} MB")

if __name__ == "__main__":
    INPUT_FILE = "data/raw/vietnam_kttv_34tinh_2025-12-06_2026-06-04.csv"
    OUTPUT_FILE = "data/processed/cleaned_data.csv"
    clean_data(INPUT_FILE, OUTPUT_FILE)
