##前记
对字符串处理不是很感冒，遂找个坑自己埋了。
##读入输出

```
char s[10];
string str; 
int a[10];
int main(){
	//sizeof 表示总字节数 对于char数组即大小 
	//scanf("%s",s);//char[]类型 省略前后空格Tab等 不读其后空格 
	//cin.getline(s,sizeof(s)); //char[]类型 整行读入 
	//cin>>s; //同scanf 但是char[] string都能用 
	getline(cin,s);//string类型 
	//getchar();//不必多说 
	cout<<s[1];
	return 0;
} 
```
##常见函数

### char[]

常用字符串函数
1
2
3
在编程中，字符串操作是非常常见的任务。以下是一些常用的字符串函数及其用法。

strlen() - 计算字符串长度

strlen() 函数用于计算字符串的长度，不包括字符串结束符 '\0'。例如：

#include <stdio.h>
#include <string.h>

int main() {
char str[] = "abcdefg";
printf("%u", strlen(str)); // 输出: 7
return 0;
}
复制
该函数返回字符串中字符的个数。

strcpy() - 复制字符串

strcpy() 函数将源字符串复制到目标字符串中，包括结束符 '\0'。例如：

#include <stdio.h>
#include <string.h>

int main() {
char str1[20];
char str2[] = "abcdef";
strcpy(str1, str2);
printf("%s", str1); // 输出: abcdef
return 0;
}
复制
注意目标字符串的空间必须足够大。

strcat() - 连接字符串

strcat() 函数将源字符串追加到目标字符串的末尾。目标字符串必须有足够的空间来容纳源字符串。示例：

#include <stdio.h>
#include <string.h>

int main() {
char str1[10] = "abcd";
char str2[] = "efg";
strcat(str1, str2);
printf("%s", str1); // 输出: abcdefg
return 0;
}
复制
该函数会将源字符串的内容追加到目标字符串的末尾。

strcmp() - 比较字符串

strcmp() 函数比较两个字符串的内容，返回值如下：

若 string1 > string2，返回一个大于0的数。

若 string1 = string2，返回0。

若 string1 < string2，返回一个小于0的数。

示例：

#include <stdio.h>
#include <string.h>

int main() {
char str1[] = "abcd";
char str2[] = "abce";
int ret = strcmp(str1, str2);
printf("%d", ret); // 输出: -1
return 0;
}
复制
该函数按字典序比较字符串。

strstr() - 查找子字符串

strstr() 函数在一个字符串中查找另一个字符串的第一次出现，返回指向该位置的指针。示例：

#include <stdio.h>
#include <string.h>

int main() {
char str1[] = "dhafjkhsdabcdrewtertwert";
char str2[] = "abc";
char* ret = strstr(str1, str2);
if (ret != NULL)
printf("%s\n", ret); // 输出: abcdrewtertwert
else
printf("找不到\n");
return 0;
}
复制
该函数返回子字符串在主字符串中第一次出现的位置。

strtok() - 分割字符串

strtok() 函数用于将字符串分割成多个子字符串。示例：

#include <stdio.h>
#include <string.h>

int main() {
char arr1[] = "15145j@qq.com";
char arr2[100] = { 0 };
strcpy(arr2, arr1);
char sep[] = "@.";
char* ret = NULL;
for (ret = strtok(arr2, sep); ret != NULL; ret = strtok(NULL, sep)) {
printf("%s\n", ret); // 输出: 15145j qq com
}
return 0;
}
复制
该函数根据指定的分隔符分割字符串。

这些字符串函数在处理字符串时非常有用，可以帮助开发者高效地完成各种字符串操作任务。。