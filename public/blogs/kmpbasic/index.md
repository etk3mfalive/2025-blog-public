## 模式串匹配

模式串匹配，就是给定一个需要处理的文本串（理论上应该很长）和一个需要在文本串中搜索的模式串（理论上长度应该远小于文本串），查询在该文本串中，给出的模式串的出现有无、次数、位置等。

## 具体步骤

构建$kmp$数组，其中$kmp[i]$表示$s$中非$s$子串$t$使得$t$既是$s$的前缀又是$s$的后缀。

其中第一个循环j表示最大的符合条件的前缀位置（1~lb）

第二个循环找到符合$b[j]==a[i]$的最大 j（找不到自然为0）

## 代码实现
```
#include <iostream>
#include <string.h>
using namespace std;
const int N=1e6+10;
char a[N],b[N];
int kmp[N];
int main(){
	scanf("%s",a+1);
	scanf("%s",b+1);
	int la=strlen(a+1),lb=strlen(b+1);
	int j=0;
	for (int i=2;i<=lb;++i){
		while (j&&b[j+1]!=b[i]) j=kmp[j];
		if (b[j+1]==b[i]) j++;
		kmp[i]=j;
	} 
	j=0;
	for (int i=1;i<=la;++i){
		while (j&&b[j+1]!=a[i]) j=kmp[j];
		if (b[j+1]==a[i]) j++;
		if (j==lb){
			printf("%d\n",i-lb+1);
			j=kmp[j];
		}
	}
	for (int i=1;i<=lb;++i) printf("%d ",kmp[i]);
	return 0;
} 
```