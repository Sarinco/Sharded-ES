import matplotlib.pyplot as plt
import numpy as np
import json
import os
import sys
import polars as pl
import matplotlib.ticker as ticker

def load_json(file_path):
    """
    Load a JSON file and return its content.
    """
    if not os.path.exists(file_path):
        print(f"File {file_path} does not exist.")
        exit(1)
    with open(file_path, 'r') as file:
        data = json.load(file)
    return data

def load_folder(folder_path):
    """
    Load all JSON files from a folder and return their content.
    """
    if not os.path.exists(folder_path):
        print(f"Folder {folder_path} does not exist.")
        exit(1)
    data = []
    for filename in os.listdir(folder_path):
        if filename.endswith('.json'):
            file_path = os.path.join(folder_path, filename)
            data += load_json(file_path)
    return data

def get_measures_dataframe(data, topic, name):
  """
  Filters a list of measure dictionaries by topic and name and returns a pandas DataFrame.

  Args:
    data: A list of dictionaries, where each dictionary represents a measure.
    topic: The topic to filter by.
    name: The name to filter by.

  Returns:
    A pandas DataFrame containing the filtered measures with columns
    'id', 'value', 'unit', 'source_site', and 'destination_site'.
    Returns an empty DataFrame if no matching measures are found.
  """
  filtered_data = []
  for item in data:
    if item.get('topic') == topic and item.get('name') == name:
      # Create a new dictionary with only the desired columns
      filtered_data.append({
          'value': item.get('value'),
          'unit': item.get('unit'),
          'source_site': item.get('source_site'),
          'destination_site': item.get('destination_site')
      })

  # Create DataFrame from the filtered data
  df = pl.DataFrame(filtered_data)

  return df

def analyze_speed_dataframe(df: pl.DataFrame, name: str, output_unit: str = 'ns'):
    """
    Analyzes speed data in a Polars DataFrame by site and site combination,
    allowing for unit selection and providing a same-site vs. different-site
    comparison.

    Calculates average, 95th percentile, min, max, count, and standard deviation
    for speed values, grouped by source/destination sites. Generates a bar
    chart visualizing average speeds per combination.

    Args:
        df: A Polars DataFrame with columns 'value' (speed in ns), 'source_site',
            and 'destination_site'.
        name: A string describing the measure (e.g., 'getProducts'). Used in titles.
        output_unit: The desired unit for the output values ('ns', 'us', 'ms', 's').
                     Input values are assumed to be in nanoseconds ('ns').

    Returns:
        A tuple containing three Polars DataFrames:
        - DataFrame with stats for all source-destination combinations.
        - DataFrame with stats for same-site requests (source_site == destination_site).
        - DataFrame with stats for different-site requests (source_site != destination_site).
    """
    if df.is_empty():
        print(f"Input DataFrame for '{name}' is empty. No analysis or plotting possible.")
        return pl.DataFrame(), pl.DataFrame(), pl.DataFrame()

    print(f"\n--- Analyzing speed data for '{name}' (Output Unit: {output_unit}) ---")

    # Define conversion factors from nanoseconds (ns)
    conversion_factors = {
        'ns': 1,
        'us': 1e-3,  # 1 microsecond = 1000 nanoseconds
        'ms': 1e-6,  # 1 millisecond = 1,000,000 nanoseconds
        's':  1e-9   # 1 second = 1,000,000,000 nanoseconds
    }

    if output_unit not in conversion_factors:
        print(f"Warning: Invalid output_unit '{output_unit}'. Defaulting to 'ns'.")
        output_unit = 'ns'

    conversion_factor = conversion_factors[output_unit]

    # Apply conversion to the 'value' column
    df_converted = df.with_columns(
        (pl.col("value") * conversion_factor).alias(f"value_{output_unit}")
    )

    # Use the converted value column for aggregations
    value_col_name = f"value_{output_unit}"
    average_col_name = f"average_{output_unit}"
    median_col_name = f"median_{output_unit}"
    percentile_col_name = f"percentile_95_{output_unit}"
    min_col_name = f"min_{output_unit}"
    max_col_name = f"max_{output_unit}"
    std_col_name = f"std_dev_{output_unit}"

    # --- 1. Analysis for all source-destination combinations ---
    print("\nCalculating statistics for all source -> destination combinations...")
    all_combinations_stats = df_converted.group_by(["source_site", "destination_site"], maintain_order=True).agg([
        pl.col(value_col_name).mean().alias(average_col_name),
        pl.col(value_col_name).median().alias(median_col_name),
        pl.col(value_col_name).quantile(0.95).alias(percentile_col_name),
        pl.col(value_col_name).min().alias(min_col_name),
        pl.col(value_col_name).max().alias(max_col_name),
        pl.col(value_col_name).std().alias(std_col_name),
        pl.col(value_col_name).count().alias("count")
    ]).sort(["source_site", "destination_site"])

    print("\nStatistics for all combinations:")
    # Display all float columns in scientific notation
    print(all_combinations_stats.select(
        pl.exclude("source_site", "destination_site", "count").cast(pl.Float64).name.suffix("_float"),
        pl.col("source_site", "destination_site", "count")
    ))


    # --- 2. Analysis for same-site requests ---
    print("\nCalculating statistics for same-site requests (source_site == destination_site)...")
    same_site_stats = df_converted.filter(
        pl.col("source_site") == pl.col("destination_site")
    ).group_by("source_site", maintain_order=True).agg([
        pl.col(value_col_name).mean().alias(average_col_name),
        pl.col(value_col_name).median().alias(median_col_name),
        pl.col(value_col_name).quantile(0.95).alias(percentile_col_name),
        pl.col(value_col_name).min().alias(min_col_name),
        pl.col(value_col_name).max().alias(max_col_name),
        pl.col(value_col_name).std().alias(std_col_name),
        pl.col(value_col_name).count().alias("count")
    ]).sort("source_site")

    print("\nStatistics for same-site requests:")
    # Display all float columns in scientific notation
    print(same_site_stats.select(
         pl.exclude("source_site", "count").cast(pl.Float64).name.suffix("_float"),
         pl.col("source_site", "count")
    ))


    # --- 3. Analysis for different-site requests ---
    print("\nCalculating statistics for different-site requests (source_site != destination_site)...")
    different_site_stats = df_converted.filter(
        pl.col("source_site") != pl.col("destination_site")
    ).group_by(["source_site", "destination_site"], maintain_order=True).agg([
        pl.col(value_col_name).mean().alias(average_col_name),
        pl.col(value_col_name).median().alias(median_col_name),
        pl.col(value_col_name).quantile(0.95).alias(percentile_col_name),
        pl.col(value_col_name).min().alias(min_col_name),
        pl.col(value_col_name).max().alias(max_col_name),
        pl.col(value_col_name).std().alias(std_col_name),
        pl.col(value_col_name).count().alias("count")
    ]).sort(["source_site", "destination_site"])

    print("\nStatistics for different-site requests:")
    # Display all float columns in scientific notation
    print(different_site_stats.select(
        pl.exclude("source_site", "destination_site", "count").cast(pl.Float64).name.suffix("_float"),
        pl.col("source_site", "destination_site", "count")
    ))

    # --- 4. Statistical Comparison (Same Site vs. Different Site) ---
    print("\n--- Same Site vs. Different Site Comparison ---")

    # Calculate overall averages for same-site and different-site
    # WARN: LSP error c'est normal elle sont pas la au runtime, c'est juste le typechecker qui se chie dessus
    same_site_avg: float = same_site_stats[average_col_name].mean()
    different_site_avg: float = different_site_stats[average_col_name].mean()

    same_site_95p: float = same_site_stats[percentile_col_name].mean()
    different_site_95p: float = different_site_stats[percentile_col_name].mean()

    print(f"\nOverall Average ({output_unit}):")
    if same_site_avg is not None:
        print(f"  Same Site: {same_site_avg:.4e}")
    else:
        print("  Same Site: No data")

    if different_site_avg is not None:
         print(f"  Different Site: {different_site_avg:.4e}")
    else:
        print("  Different Site: No data")


    print(f"\nOverall 95th Percentile ({output_unit}):")
    if same_site_95p is not None:
        print(f"  Same Site: {same_site_95p:.4e}")
    else:
         print("  Same Site: No data")

    if different_site_95p is not None:
        print(f"  Different Site: {different_site_95p:.4e}")
    else:
        print("  Different Site: No data")


    print("\nComparison Summary:")
    if same_site_avg is not None and different_site_avg is not None:
        avg_diff = different_site_avg - same_site_avg
        # Avoid division by zero if same_site_avg is zero
        avg_percent_diff = (avg_diff / same_site_avg) * 100 if same_site_avg != 0 else float('inf')
        print(f"  Average Difference (Different - Same): {avg_diff:.4e} {output_unit}")
        if avg_percent_diff != float('inf'):
             print(f"  Average Percentage Difference: {avg_percent_diff:.2f}%")
        else:
            print("  Average Percentage Difference: Infinite (Same Site Average is zero)")

    if same_site_95p is not None and different_site_95p is not None:
        p95_diff = different_site_95p - same_site_95p
         # Avoid division by zero if same_site_95p is zero
        p95_percent_diff = (p95_diff / same_site_95p) * 100 if same_site_95p != 0 else float('inf')
        print(f"  95th Percentile Difference (Different - Same): {p95_diff:.4e} {output_unit}")
        if p95_percent_diff != float('inf'):
            print(f"  95th Percentage Difference: {p95_percent_diff:.2f}%")
        else:
            print("  95th Percentage Difference: Infinite (Same Site 95th Percentile is zero)")


    print(f"\n--- Analysis Complete for '{name}' ---")

    return all_combinations_stats, same_site_stats, different_site_stats

def plot_speed_histogram(df: pl.DataFrame, name: str, output_unit: str = 'ns'):
    plot_data = df.with_columns(
        pl.concat_str([pl.col("source_site"), pl.lit(" -> "), pl.col("destination_site")]).alias("combination")
    )
    if not plot_data.is_empty():
        fig, ax = plt.subplots(figsize=(12, 7))

        ax.bar(plot_data["combination"], plot_data[f"average_{output_unit}"])

        ax.set_xlabel("Site Combination")
        ax.set_ylabel("Average Speed (ns)")
        ax.set_title(f"Average Speed by Site Combination for '{name}'")
        plt.xticks(rotation=45, ha='right') # Rotate labels to prevent overlap
        plt.grid(axis='y', linestyle='--', alpha=0.7) # Add a horizontal grid
        plt.tight_layout() # Adjust layout to prevent labels from being cut off
        plt.show()
    else:
        print("No data found for plotting combinations.")

if __name__ == "__main__":
    # Get the folder path from the command line arguments
    if len(sys.argv) != 4:
        print("Usage: python main.py <folder_path> <topic> <name>")
        exit(1)
    folder_path = sys.argv[1]
    topic = sys.argv[2]
    name = sys.argv[3]
    # Load the JSON files from the folder
    data = load_folder(folder_path)
    print(f"Loaded {len(data)} JSON files from {folder_path}.")

    dataframe = get_measures_dataframe(data, topic, name)
    if dataframe.is_empty():
        print("No measures found for the specified topic and name.")
    else:
        # print("Filtered measures:")
        # print(dataframe.head())
        # Analyze the speed data
        all_combinations_stats, same_site_stats, different_site_stats = analyze_speed_dataframe(dataframe, name, output_unit='ms')
        # Plot the histogram of speed values
        plot_speed_histogram(all_combinations_stats, name, output_unit='ms')

    print("Data loaded successfully.")


